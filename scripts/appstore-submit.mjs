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
//   ASC_SUBMIT=true     Explicitly authorize App Review submission (default false)
//   ASC_AUTOMATIC_RELEASE=true  Release after approval (default manual)
//   ASC_REVIEW_RECORDING_PATH
//                       Upload a physical-device recording to App Review
//
// Usage: node scripts/appstore-submit.mjs
//
// Note: the App Privacy ("Data Not Collected") questionnaire has no public API
// and must be published once in App Store Connect before the first submission.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const META_DIR = path.join(ROOT, "appstore/metadata/en-US");
const SCREENSHOT_DIR = path.join(ROOT, "branding/store/screenshots/2880x1800");
const SCREENSHOTS = ["overview.png", "detail.png", "logs.png", "login-items.png"];
const PKG_PATH = path.join(ROOT, "release/appstore/Launchpane.pkg");

const KEY_ID = process.env.ASC_KEY_ID || process.env.APP_STORE_CONNECT_API_KEY_ID;
const ISSUER_ID = process.env.ASC_ISSUER_ID || process.env.APP_STORE_CONNECT_API_ISSUER_ID;
const KEY_PATH = process.env.ASC_KEY_PATH || process.env.APP_STORE_CONNECT_API_KEY_PATH || `AuthKey_${KEY_ID}.p8`;
const APP_ID = process.env.ASC_APP_ID;
const SUBMIT = booleanSetting("ASC_SUBMIT");
const AUTOMATIC_RELEASE = booleanSetting("ASC_AUTOMATIC_RELEASE");
const REVIEW_RECORDING_PATH = process.env.ASC_REVIEW_RECORDING_PATH;

const EDITABLE_STATES = [
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
];

function selectVersion(versions) {
  const selected = versions.find(version => version.attributes.versionString === appVersion);
  if (selected && !EDITABLE_STATES.includes(selected.attributes.appStoreState)) {
    throw new Error(`Version ${appVersion} is not editable (${selected.attributes.appStoreState})`);
  }
  if (!selected) {
    const pending = versions.find(version => ![
      "READY_FOR_SALE", "READY_FOR_DISTRIBUTION", "REMOVED_FROM_SALE",
      "DEVELOPER_REMOVED_FROM_SALE", "REPLACED_WITH_NEW_VERSION",
    ].includes(version.attributes.appStoreState));
    if (pending) throw new Error(`Version ${pending.attributes.versionString} is still ${pending.attributes.appStoreState}; resolve it before creating ${appVersion}`);
  }
  return selected;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function booleanSetting(name) {
  const value = process.env[name] ?? "false";
  if (!["true", "false"].includes(value)) throw new Error(`${name} must be true or false`);
  return value === "true";
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
  if (new URL(url).origin !== "https://api.appstoreconnect.apple.com") {
    throw new Error("Refusing to send Apple credentials to an unexpected API origin");
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
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

async function list(endpoint) {
  const data = [];
  let next = endpoint;
  while (next) {
    const page = await api("GET", next);
    data.push(...page.data);
    next = page.links?.next;
  }
  return data;
}

const appVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
).version;

export async function editableVersion() {
  const data = await list(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=MAC_OS&limit=200`);
  const version = selectVersion(data);
  const copyright = read("copyright.txt");
  const attributes = { copyright, releaseType: AUTOMATIC_RELEASE ? "AFTER_APPROVAL" : "MANUAL" };
  if (!version) {
    const created = await api("POST", "/v1/appStoreVersions", {
      data: {
        type: "appStoreVersions",
        attributes: { ...attributes, versionString: appVersion, platform: "MAC_OS" },
        relationships: { app: { data: { type: "apps", id: APP_ID } } },
      },
    });
    return created.data.id;
  }
  await api("PATCH", `/v1/appStoreVersions/${version.id}`, {
    data: { type: "appStoreVersions", id: version.id, attributes },
  });
  return version.id;
}

async function setVersionLocalization(versionId) {
  const { data } = await api(
    "GET",
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  const versions = await list(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=MAC_OS&limit=200`);
  const hasPublicVersion = versions.some(version => ["READY_FOR_SALE", "READY_FOR_DISTRIBUTION"].includes(version.attributes.appStoreState));
  const attributes = {
    description: read("description.txt"),
    keywords: read("keywords.txt"),
    marketingUrl: read("marketing-url.txt"),
    promotionalText: read("promotional-text.txt"),
    supportUrl: read("support-url.txt"),
    ...(hasPublicVersion ? { whatsNew: read("release-notes.txt") } : {}),
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

  // Apple rejects "What's New" on the first version, not every HTTP 409.
  await patch(attributes);
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
  if (!declarationId) throw new Error("App information has no age rating declaration");
  const attributes = JSON.parse(
    fs.readFileSync(path.join(ROOT, "appstore/age-rating.json"), "utf8"),
  );

  await api("PATCH", `/v1/ageRatingDeclarations/${declarationId}`, {
    data: {
      type: "ageRatingDeclarations",
      id: declarationId,
      attributes,
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
  if (!reservation.attributes.uploadOperations?.length) throw new Error(`${label} has no upload operations`);
  for (const [index, op] of (reservation.attributes.uploadOperations || []).entries()) {
    if (!Number.isInteger(op.offset) || !Number.isInteger(op.length) || op.offset < 0 || op.length <= 0
        || op.offset + op.length > buffer.length) throw new Error(`${label} has an invalid upload range`);
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

  for (const id of ids) {
    let complete = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const { data } = await api("GET", `/v1/appScreenshots/${id}`);
      const state = data.attributes.assetDeliveryState;
      if (state?.state === "FAILED" || state?.errors?.length) throw new Error(`Screenshot ${id} failed processing`);
      if (state?.state === "COMPLETE") { complete = true; break; }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (!complete) throw new Error(`Screenshot ${id} processing timed out; previous screenshots were preserved`);
  }
  for (const shot of current.data) {
    await api("DELETE", `/v1/appScreenshots/${shot.id}`);
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
  const marketing = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
  const identifier = plist.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
  if (marketing !== appVersion || identifier !== "com.webmaxru.launchpane") {
    throw new Error("Built app version or bundle identifier does not match the release");
  }
  if (match[1] !== required("APP_BUILD_NUMBER")) {
    throw new Error("Built app CFBundleVersion does not match APP_BUILD_NUMBER");
  }
  return match[1];
}

// `altool --validate-app` (Xcode 26+) registers an AWAITING_UPLOAD buildUpload
// holding only analysis files. It reserves the number for this exact candidate
// and is completed by attaching the package rather than creating a duplicate.
function isValidationReservation(upload, buildNumber) {
  const { cfBundleVersion, cfBundleShortVersionString, uploadedDate, state } = upload.attributes;
  return cfBundleVersion === buildNumber && cfBundleShortVersionString === appVersion
    && !uploadedDate && state?.state === "AWAITING_UPLOAD" && !state.errors?.length;
}

export async function preflight(buildNumber, { allowValidationReservation = false } = {}) {
  if (!KEY_ID || !ISSUER_ID || !APP_ID) throw new Error("Apple API key, issuer, and ASC_APP_ID are required");
  const { data: app } = await api("GET", `/v1/apps/${APP_ID}`);
  if (app.attributes.bundleId !== "com.webmaxru.launchpane") throw new Error("ASC_APP_ID belongs to a different bundle");
  const versions = await list(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=MAC_OS&limit=200`);
  if (buildNumber !== undefined) selectVersion(versions);
  const builds = await list(`/v1/apps/${APP_ID}/builds?limit=200`);
  const uploads = await list(`/v1/apps/${APP_ID}/buildUploads?limit=200`);
  let reservation;
  if (buildNumber !== undefined) {
    if (!/^[1-9]\d{0,17}$/.test(buildNumber)) throw new Error("APP_BUILD_NUMBER must be a positive integer of at most 18 digits");
    const reservations = allowValidationReservation
      ? uploads.filter(upload => isValidationReservation(upload, buildNumber)) : [];
    if (reservations.length > 1) throw new Error(`Multiple validation reservations exist for build ${buildNumber}; inspect them before uploading`);
    reservation = reservations[0];
    const existingNumbers = [
      ...builds.map(b => b.attributes.version),
      ...uploads.filter(u => u !== reservation).map(u => u.attributes.cfBundleVersion),
    ];
    if (existingNumbers.some(n => /^\d+$/.test(n) && BigInt(n) >= BigInt(buildNumber))) {
      throw new Error("APP_BUILD_NUMBER must exceed all existing Apple build/upload numbers; do not reuse an uploaded candidate");
    }
  }
  return { version: appVersion, reservation: reservation?.id, versions: versions.map(v => ({
    version: v.attributes.versionString, state: v.attributes.appStoreState,
  })), builds: builds.map(b => ({ number: b.attributes.version, state: b.attributes.processingState })) };
}

async function reservedUpload(id) {
  const files = await list(`/v1/buildUploads/${id}/buildUploadFiles`);
  if (files.some(file => file.attributes.assetType === "ASSET")) {
    throw new Error(`Build upload ${id} already has a package; do not reuse an uploaded candidate`);
  }
  log(`completing validation reservation ${id}`);
  return { id };
}

export async function uploadBuild(buildNumber, packagePath = PKG_PATH) {
  const { reservation } = await preflight(buildNumber, { allowValidationReservation: true });
  const upload = reservation ? await reservedUpload(reservation) : (
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

  const buffer = fs.readFileSync(packagePath);
  const file = (
      await api("POST", "/v1/buildUploadFiles", {
        data: {
          type: "buildUploadFiles",
          attributes: {
            assetType: "ASSET",
            fileName: path.basename(packagePath),
            fileSize: buffer.length,
            uti: "com.apple.pkg",
          },
          relationships: {
            buildUpload: { data: { type: "buildUploads", id: upload.id } },
          },
        },
      })
    ).data;

  log(`uploading ${path.basename(packagePath)} (${buffer.length} bytes)`);
  await uploadAsset(file, buffer, "package");
  await api("PATCH", `/v1/buildUploadFiles/${file.id}`, {
    data: {
      type: "buildUploadFiles",
      id: file.id,
      attributes: { uploaded: true, sourceFileChecksums: { file: {}, composite: {} } },
    },
  });
  log("upload committed; waiting for Apple to process the build");

  let complete = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { data } = await api("GET", `/v1/buildUploads/${upload.id}`);
    const { state, errors } = data.attributes.state;
    if (errors?.length) {
      throw new Error(`Build rejected:\n${JSON.stringify(errors, null, 2)}`);
    }
    if (state === "FAILED") throw new Error(`Build upload ${upload.id} failed`);
    if (state === "COMPLETE") { complete = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!complete) throw new Error(`Build upload ${upload.id} timed out; inspect it before preparing a new candidate`);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const builds = await list(`/v1/builds?filter[app]=${APP_ID}&include=preReleaseVersion&limit=200`);
    const build = builds.find(b => b.attributes.version === buildNumber);
    if (build) {
      const prereleaseId = build.relationships.preReleaseVersion?.data?.id;
      if (!prereleaseId) throw new Error("Processed build has no marketing version relationship");
      const { data: prerelease } = await api("GET", `/v1/preReleaseVersions/${prereleaseId}`);
      if (prerelease.attributes.version !== appVersion || prerelease.attributes.platform !== "MAC_OS") {
        throw new Error("Processed build belongs to a different marketing version or platform");
      }
      if (["INVALID", "FAILED"].includes(build.attributes.processingState)) throw new Error("Apple rejected the processed build");
      if (build.attributes.processingState === "VALID") return build;
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error(`Build ${buildNumber} did not become VALID before the processing timeout`);
}

async function attachBuild(versionId, build) {
  if (build.attributes.processingState !== "VALID") throw new Error("Cannot attach a build before VALID processing");
    await api("PATCH", `/v1/builds/${build.id}`, {
      data: {
        type: "builds",
        id: build.id,
        attributes: { usesNonExemptEncryption: false },
      },
    });
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
  ).catch(error => {
    if (error.status !== 404) throw error;
    return null;
  });

  if (existing?.data?.id) {
    await api("PATCH", `/v1/appStoreReviewDetails/${existing.data.id}`, {
      data: { type: "appStoreReviewDetails", id: existing.data.id, attributes },
    });
    log("app review information set");
    return existing.data.id;
  } else {
    const created = await api("POST", "/v1/appStoreReviewDetails", {
      data: {
        type: "appStoreReviewDetails",
        attributes,
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
    log("app review information set");
    return created.data.id;
  }
}

async function uploadReviewRecording(reviewDetailId) {
  if (!REVIEW_RECORDING_PATH) return;

  const recordingPath = path.resolve(REVIEW_RECORDING_PATH);
  const fileName = path.basename(recordingPath);
  const buffer = fs.readFileSync(recordingPath);
  const current = await api(
    "GET",
    `/v1/appStoreReviewDetails/${reviewDetailId}/appStoreReviewAttachments`,
  );
  const existing = current.data.find(
    (attachment) =>
      attachment.attributes.fileName === fileName &&
      attachment.attributes.assetDeliveryState?.state === "COMPLETE",
  );
  if (existing) {
    log(`review recording ${fileName} already uploaded`);
    return;
  }

  const reservation = await api("POST", "/v1/appStoreReviewAttachments", {
    data: {
      type: "appStoreReviewAttachments",
      attributes: { fileName, fileSize: buffer.length },
      relationships: {
        appStoreReviewDetail: {
          data: { type: "appStoreReviewDetails", id: reviewDetailId },
        },
      },
    },
  });
  await uploadAsset(reservation.data, buffer, fileName);
  await api("PATCH", `/v1/appStoreReviewAttachments/${reservation.data.id}`, {
    data: {
      type: "appStoreReviewAttachments",
      id: reservation.data.id,
      attributes: {
        uploaded: true,
        sourceFileChecksum: crypto.createHash("md5").update(buffer).digest("hex"),
      },
    },
  });
  log(`uploaded App Review recording ${fileName}`);
}

export async function submit(versionId) {
  const submissions = (await list(`/v1/apps/${APP_ID}/reviewSubmissions?limit=200`))
    .filter(s => s.attributes.platform === "MAC_OS");
  const open = submissions.find((s) =>
    ["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(s.attributes.state),
  );
  if (open) {
    throw new Error(`An existing review submission is ${open.attributes.state}; do not submit another version`);
  }

  let submission = submissions.find(
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
  if (items.data.some(item => item.relationships.appStoreVersion?.data?.id !== versionId)) {
    throw new Error("Existing review submission contains another version; refusing to retarget it");
  }
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
  return result.data;
}

export async function main() {
  const mode = process.argv[2];
  if (mode && !["--preflight", "--status"].includes(mode)) throw new Error("Usage: appstore-submit.mjs [--preflight|--status]");
  if (mode) {
    console.log(JSON.stringify(await preflight(mode === "--status" ? undefined : required("APP_BUILD_NUMBER")), null, 2));
    return;
  }
  for (const name of ["ASC_CONTACT_FIRST_NAME", "ASC_CONTACT_LAST_NAME", "ASC_CONTACT_EMAIL", "ASC_CONTACT_PHONE"]) required(name);
  for (const name of SCREENSHOTS) fs.accessSync(path.join(SCREENSHOT_DIR, name), fs.constants.R_OK);
  for (const name of ["copyright.txt", "description.txt", "keywords.txt", "marketing-url.txt", "promotional-text.txt", "support-url.txt", "name.txt", "subtitle.txt", "privacy-policy-url.txt", "release-notes.txt", "review-notes.txt"]) read(name);
  const buildNumber = bundleVersion();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "release/appstore/manifest.json"), "utf8"));
  if (manifest.version !== appVersion || manifest.buildNumber !== buildNumber) throw new Error("Store manifest version/build does not match the signed app");
  const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, "release/appstore/build.json"), "utf8"));
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(PKG_PATH)).digest("hex");
  const source = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n")
    .filter(file => file && !file.startsWith("branding/store/screenshots/"));
  // CI regenerates these derived PNGs from fingerprinted native sources; image
  // encoders can differ across macOS versions without changing the app source.
  if (changed.length) {
    throw new Error("Release source has uncommitted tracked changes; freeze the candidate before uploading");
  }
  if (receipt.version !== appVersion || receipt.buildNumber !== buildNumber || receipt.sourceCommit !== source
      || receipt.distribution !== "app-store" || receipt.packageSha256 !== sha256) throw new Error("Signed package receipt does not match the source, version, build, or package bytes");
  const { readCaptureManifest } = await import("./store-screenshot-source.ts");
  readCaptureManifest(ROOT);
  // Upload/processing must pass before changing live metadata or screenshots.
  const build = await uploadBuild(buildNumber);
  const versionId = await editableVersion();
  const localizationId = await setVersionLocalization(versionId);
  const appInfoId = await setAppInfo();
  await setAgeRating(appInfoId);
  await setContentRights();
  await uploadScreenshots(localizationId);
  await attachBuild(versionId, build);
  const reviewDetailId = await setReviewDetail(versionId);
  await uploadReviewRecording(reviewDetailId);
  if (SUBMIT) await submit(versionId);
  else log(`Upload prepared with ${AUTOMATIC_RELEASE ? "automatic" : "manual"} release; stopping before App Review submission`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
