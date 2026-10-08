#!/usr/bin/env node
// Publish Launchpane to App Store Connect with the REST API only.
//
// Required environment:
//   ASC_KEY_ID      App Store Connect API key id
//   ASC_ISSUER_ID   App Store Connect issuer id
//   ASC_KEY_PATH    Path to the AuthKey_<ASC_KEY_ID>.p8 private key
//   ASC_APP_ID      Apple ID of the app record
// Optional:
//   ASC_CONTACT_FIRST_NAME / ASC_CONTACT_LAST_NAME / ASC_CONTACT_EMAIL /
//   ASC_CONTACT_PHONE   App Review contact details
//   ASC_SUBMIT=false    Prepare everything but stop before submitting
//
// Usage: node scripts/appstore-submit.mjs
//
// Note: the App Privacy ("Data Not Collected") questionnaire has no public API
// and must be published once in App Store Connect before the first submission.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const META_DIR = path.join(ROOT, "appstore/metadata/en-US");
const SCREENSHOT_DIR = path.join(ROOT, "branding/store/screenshots/2880x1800");
const SCREENSHOTS = ["overview.png", "detail.png", "logs.png", "login-items.png"];
const PKG_PATH = path.join(ROOT, "release/appstore/Launchpane.pkg");

const KEY_ID = required("ASC_KEY_ID");
const ISSUER_ID = required("ASC_ISSUER_ID");
const KEY_PATH = process.env.ASC_KEY_PATH || `AuthKey_${KEY_ID}.p8`;
const APP_ID = required("ASC_APP_ID");
const SUBMIT = process.env.ASC_SUBMIT !== "false";

const EDITABLE_STATES = [
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function read(name) {
  return fs.readFileSync(path.join(META_DIR, name), "utf8").trim();
}

function log(...args) {
  console.log("•", ...args);
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 900, aud: "appstoreconnect-v1" };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign(null, Buffer.from(input), {
    key: fs.readFileSync(KEY_PATH, "utf8"),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${base64url(signature)}`;
}

async function api(method, endpoint, body) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.appstoreconnect.apple.com${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = new Error(
      `${method} ${endpoint} -> ${res.status}\n${JSON.stringify(json, null, 2)}`,
    );
    error.status = res.status;
    error.body = json;
    throw error;
  }
  return json;
}

const appVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
).version;

async function editableVersion() {
  const { data } = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=MAC_OS`,
  );
  const version = data.find((v) => EDITABLE_STATES.includes(v.attributes.appStoreState));
  if (!version) throw new Error("No editable macOS version in App Store Connect");

  const copyright = read("copyright.txt");
  if (
    version.attributes.versionString !== appVersion ||
    version.attributes.copyright !== copyright
  ) {
    await api("PATCH", `/v1/appStoreVersions/${version.id}`, {
      data: {
        type: "appStoreVersions",
        id: version.id,
        attributes: {
          versionString: appVersion,
          copyright,
          releaseType: "AFTER_APPROVAL",
        },
      },
    });
    log(`version ${appVersion} and copyright set`);
  }
  return version.id;
}

async function setVersionLocalization(versionId) {
  const { data } = await api(
    "GET",
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  const attributes = {
    description: read("description.txt"),
    keywords: read("keywords.txt"),
    marketingUrl: read("marketing-url.txt"),
    promotionalText: read("promotional-text.txt"),
    supportUrl: read("support-url.txt"),
  };
  const existing = data.find((l) => l.attributes.locale === "en-US");

  if (!existing) {
    const created = await api("POST", "/v1/appStoreVersionLocalizations", {
      data: {
        type: "appStoreVersionLocalizations",
        attributes: { ...attributes, locale: "en-US" },
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
    log("version localization created");
    return created.data.id;
  }

  const patch = (attrs) =>
    api("PATCH", `/v1/appStoreVersionLocalizations/${existing.id}`, {
      data: { type: "appStoreVersionLocalizations", id: existing.id, attributes: attrs },
    });

  // Release notes are rejected on an app's very first version.
  try {
    await patch({ ...attributes, whatsNew: read("release-notes.txt") });
  } catch (error) {
    if (error.status !== 409) throw error;
    await patch(attributes);
  }
  log("version localization updated");
  return existing.id;
}

async function setAppInfo() {
  const { data } = await api("GET", `/v1/apps/${APP_ID}/appInfos`);
  const info = data.find((i) => EDITABLE_STATES.includes(i.attributes.state));
  if (!info) throw new Error("No editable appInfo");

  await api("PATCH", `/v1/appInfos/${info.id}`, {
    data: {
      type: "appInfos",
      id: info.id,
      relationships: {
        primaryCategory: { data: { type: "appCategories", id: "UTILITIES" } },
      },
    },
  });

  const attributes = {
    name: read("name.txt"),
    subtitle: read("subtitle.txt"),
    privacyPolicyUrl: read("privacy-policy-url.txt"),
  };
  const locs = await api("GET", `/v1/appInfos/${info.id}/appInfoLocalizations`);
  const existing = locs.data.find((l) => l.attributes.locale === "en-US");
  if (existing) {
    await api("PATCH", `/v1/appInfoLocalizations/${existing.id}`, {
      data: { type: "appInfoLocalizations", id: existing.id, attributes },
    });
  } else {
    await api("POST", "/v1/appInfoLocalizations", {
      data: {
        type: "appInfoLocalizations",
        attributes: { ...attributes, locale: "en-US" },
        relationships: { appInfo: { data: { type: "appInfos", id: info.id } } },
      },
    });
  }
  log("app information updated");
  return info.id;
}

async function setAgeRating(appInfoId) {
  const { data } = await api("GET", `/v1/appInfos/${appInfoId}?include=ageRatingDeclaration`);
  const declarationId = data.relationships.ageRatingDeclaration?.data?.id;
  if (!declarationId) return;

  await api("PATCH", `/v1/ageRatingDeclarations/${declarationId}`, {
    data: {
      type: "ageRatingDeclarations",
      id: declarationId,
      attributes: {
        alcoholTobaccoOrDrugUseOrReferences: "NONE",
        contests: "NONE",
        gamblingSimulated: "NONE",
        horrorOrFearThemes: "NONE",
        matureOrSuggestiveThemes: "NONE",
        medicalOrTreatmentInformation: "NONE",
        profanityOrCrudeHumor: "NONE",
        sexualContentGraphicAndNudity: "NONE",
        sexualContentOrNudity: "NONE",
        violenceCartoonOrFantasy: "NONE",
        violenceRealistic: "NONE",
        violenceRealisticProlongedGraphicOrSadistic: "NONE",
        ageRatingOverride: "NONE",
        kidsAgeBand: null,
        advertising: false,
        ageAssurance: false,
        gambling: false,
        gunsOrOtherWeapons: false,
        healthOrWellnessTopics: false,
        lootBox: false,
        messagingAndChat: false,
        parentalControls: false,
        unrestrictedWebAccess: false,
        userGeneratedContent: false,
      },
    },
  });
  log("age rating declared");
}

async function setContentRights() {
  await api("PATCH", `/v1/apps/${APP_ID}`, {
    data: {
      type: "apps",
      id: APP_ID,
      attributes: { contentRightsDeclaration: "DOES_NOT_USE_THIRD_PARTY_CONTENT" },
    },
  });
  log("content rights declared");
}

async function uploadAsset(reservation, buffer, label) {
  for (const [index, op] of (reservation.attributes.uploadOperations || []).entries()) {
    const headers = Object.fromEntries(
      (op.requestHeaders || []).map((h) => [h.name, h.value]),
    );
    const res = await fetch(op.url, {
      method: op.method,
      headers,
      body: buffer.subarray(op.offset, op.offset + op.length),
    });
    if (!res.ok) throw new Error(`${label} chunk ${index} failed: ${res.status}`);
  }
}

async function uploadScreenshots(localizationId) {
  const sets = await api(
    "GET",
    `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`,
  );
  let setId = sets.data.find(
    (s) => s.attributes.screenshotDisplayType === "APP_DESKTOP",
  )?.id;

  if (!setId) {
    const created = await api("POST", "/v1/appScreenshotSets", {
      data: {
        type: "appScreenshotSets",
        attributes: { screenshotDisplayType: "APP_DESKTOP" },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: "appStoreVersionLocalizations", id: localizationId },
          },
        },
      },
    });
    setId = created.data.id;
  }

  const current = await api("GET", `/v1/appScreenshotSets/${setId}/appScreenshots`);
  for (const shot of current.data) {
    await api("DELETE", `/v1/appScreenshots/${shot.id}`);
  }

  const ids = [];
  for (const fileName of SCREENSHOTS) {
    const buffer = fs.readFileSync(path.join(SCREENSHOT_DIR, fileName));
    const reservation = await api("POST", "/v1/appScreenshots", {
      data: {
        type: "appScreenshots",
        attributes: { fileSize: buffer.length, fileName },
        relationships: {
          appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } },
        },
      },
    });
    await uploadAsset(reservation.data, buffer, fileName);
    await api("PATCH", `/v1/appScreenshots/${reservation.data.id}`, {
      data: {
        type: "appScreenshots",
        id: reservation.data.id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: crypto.createHash("md5").update(buffer).digest("hex"),
        },
      },
    });
    ids.push(reservation.data.id);
    log(`uploaded ${fileName}`);
  }

  await api("PATCH", `/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, {
    data: ids.map((id) => ({ type: "appScreenshots", id })),
  });
  log("screenshot order set");
}

function bundleVersion() {
  const plist = fs.readFileSync(
    path.join(
      ROOT,
      "src-tauri/target/universal-apple-darwin/release/bundle/macos/Launchpane.app/Contents/Info.plist",
    ),
    "utf8",
  );
  const match = plist.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
  if (!match) throw new Error("Could not read CFBundleVersion from the built app");
  return match[1];
}

async function uploadBuild(buildNumber) {
  const existingBuilds = await api("GET", `/v1/apps/${APP_ID}/builds?limit=100`);
  const done = existingBuilds.data.find((b) => b.attributes.version === buildNumber);
  if (done) {
    log(`build ${buildNumber} already uploaded (${done.attributes.processingState})`);
    return done;
  }

  const uploads = await api("GET", `/v1/apps/${APP_ID}/buildUploads`);
  let upload = uploads.data.find(
    (u) =>
      u.attributes.cfBundleVersion === buildNumber &&
      u.attributes.state.state === "AWAITING_UPLOAD",
  );

  if (!upload) {
    upload = (
      await api("POST", "/v1/buildUploads", {
        data: {
          type: "buildUploads",
          attributes: {
            cfBundleShortVersionString: appVersion,
            cfBundleVersion: buildNumber,
            platform: "MAC_OS",
          },
          relationships: { app: { data: { type: "apps", id: APP_ID } } },
        },
      })
    ).data;
  }

  const buffer = fs.readFileSync(PKG_PATH);
  const files = await api("GET", `/v1/buildUploads/${upload.id}/buildUploadFiles`);
  let file = files.data.find((f) => f.attributes.assetType === "ASSET");
  if (!file) {
    file = (
      await api("POST", "/v1/buildUploadFiles", {
        data: {
          type: "buildUploadFiles",
          attributes: {
            assetType: "ASSET",
            fileName: path.basename(PKG_PATH),
            fileSize: buffer.length,
            uti: "com.apple.pkg",
          },
          relationships: {
            buildUpload: { data: { type: "buildUploads", id: upload.id } },
          },
        },
      })
    ).data;
  }

  log(`uploading ${path.basename(PKG_PATH)} (${buffer.length} bytes)`);
  await uploadAsset(file, buffer, "package");
  await api("PATCH", `/v1/buildUploadFiles/${file.id}`, {
    data: {
      type: "buildUploadFiles",
      id: file.id,
      attributes: { uploaded: true, sourceFileChecksums: { file: {}, composite: {} } },
    },
  });
  log("upload committed; waiting for Apple to process the build");

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { data } = await api("GET", `/v1/buildUploads/${upload.id}`);
    const { state, errors } = data.attributes.state;
    if (errors?.length) {
      throw new Error(`Build rejected:\n${JSON.stringify(errors, null, 2)}`);
    }
    if (state === "COMPLETE") break;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  const builds = await api("GET", `/v1/apps/${APP_ID}/builds?limit=100`);
  const build = builds.data.find((b) => b.attributes.version === buildNumber);
  if (!build) throw new Error(`Build ${buildNumber} never appeared`);
  log(`build ${buildNumber} is ${build.attributes.processingState}`);
  return build;
}

async function attachBuild(versionId, build) {
  try {
    await api("PATCH", `/v1/builds/${build.id}`, {
      data: {
        type: "builds",
        id: build.id,
        attributes: { usesNonExemptEncryption: false },
      },
    });
  } catch (error) {
    if (error.status !== 409) throw error;
  }
  await api("PATCH", `/v1/appStoreVersions/${versionId}/relationships/build`, {
    data: { type: "builds", id: build.id },
  });
  log("build attached and export compliance declared");
}

async function setReviewDetail(versionId) {
  const attributes = {
    contactFirstName: required("ASC_CONTACT_FIRST_NAME"),
    contactLastName: required("ASC_CONTACT_LAST_NAME"),
    contactEmail: required("ASC_CONTACT_EMAIL"),
    contactPhone: required("ASC_CONTACT_PHONE"),
    demoAccountRequired: false,
    notes: read("review-notes.txt"),
  };
  const existing = await api(
    "GET",
    `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`,
  ).catch(() => null);

  if (existing?.data?.id) {
    await api("PATCH", `/v1/appStoreReviewDetails/${existing.data.id}`, {
      data: { type: "appStoreReviewDetails", id: existing.data.id, attributes },
    });
  } else {
    await api("POST", "/v1/appStoreReviewDetails", {
      data: {
        type: "appStoreReviewDetails",
        attributes,
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
  }
  log("app review information set");
}

async function submit(versionId) {
  const submissions = await api("GET", `/v1/apps/${APP_ID}/reviewSubmissions?limit=20`);
  const open = submissions.data.find((s) =>
    ["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(s.attributes.state),
  );
  if (open) {
    log(`already submitted (${open.attributes.state})`);
    return;
  }

  let submission = submissions.data.find(
    (s) => s.attributes.state === "READY_FOR_REVIEW",
  );
  if (!submission) {
    submission = (
      await api("POST", "/v1/reviewSubmissions", {
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "MAC_OS" },
          relationships: { app: { data: { type: "apps", id: APP_ID } } },
        },
      })
    ).data;
  }

  const items = await api("GET", `/v1/reviewSubmissions/${submission.id}/items`);
  if (!items.data.length) {
    await api("POST", "/v1/reviewSubmissionItems", {
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: { data: { type: "reviewSubmissions", id: submission.id } },
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
  }

  const result = await api("PATCH", `/v1/reviewSubmissions/${submission.id}`, {
    data: {
      type: "reviewSubmissions",
      id: submission.id,
      attributes: { submitted: true },
    },
  });
  log(`submitted for review (${result.data.attributes.state})`);
}

const versionId = await editableVersion();
const localizationId = await setVersionLocalization(versionId);
const appInfoId = await setAppInfo();
await setAgeRating(appInfoId);
await setContentRights();
await uploadScreenshots(localizationId);
const build = await uploadBuild(bundleVersion());
await attachBuild(versionId, build);
await setReviewDetail(versionId);
if (SUBMIT) await submit(versionId);
else log("ASC_SUBMIT=false, stopping before submission");
