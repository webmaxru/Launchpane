import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import crypto from "node:crypto";
import { resolve, join } from "node:path";

const repo = process.env.GH_REPO || "webmaxru/Launchpane";
const directory = resolve(required("STORE_CREDENTIAL_DIRECTORY"));
const passwordFile = resolve(required("STORE_CERTIFICATE_PASSWORD_FILE"));
if (statSync(passwordFile).mode & 0o077) throw new Error("Certificate password file must not be accessible by other users");
const password = readFileSync(passwordFile, "utf8").replace(/\r?\n$/, "");
const keyId = required("APP_STORE_CONNECT_API_KEY_ID");
const issuer = required("APP_STORE_CONNECT_API_ISSUER_ID");
const keyPath = resolve(required("APP_STORE_CONNECT_API_KEY_PATH"));
const apply = process.argv.includes("--apply");
if (process.argv.slice(2).length > 1 || process.argv.slice(2).some(arg => !["--apply", "--check"].includes(arg))) {
  throw new Error("Usage: configure-store-environment.mjs [--check|--apply]");
}

function required(name) {
  if (!process.env[name]) throw new Error(`${name} is required`);
  return process.env[name];
}
function gh(args, input) {
  return execFileSync("gh", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}
function jsonGh(args, body) {
  return JSON.parse(gh(["api", ...args, ...(body ? ["--input", "-"] : [])], body ? JSON.stringify(body) : undefined));
}
function privateExec(command, args, options) {
  try {
    return execFileSync(command, args, { stdio: "pipe", ...options });
  } catch (error) {
    // Child-process errors can contain partially decoded key material in stdout.
    throw new Error(`Credential validation command ${command} failed (exit ${error.status}); no private output was logged`);
  }
}
function publicKey(certificate) {
  return crypto.createPublicKey(certificate).export({ type: "spki", format: "der" });
}
const files = {
  MACOS_APPLICATION_CERTIFICATE_BASE64: "app.p12",
  MACOS_INSTALLER_CERTIFICATE_BASE64: "installer.p12",
  MACOS_PROVISIONING_PROFILE_BASE64: "Launchpane.provisionprofile",
};
const secrets = {};
for (const [name, file] of Object.entries(files)) {
  secrets[name] = readFileSync(join(directory, file)).toString("base64");
}
if (!password) throw new Error("Certificate export password must not be empty");
const certificates = {};
for (const [name, prefix] of [["application", "app"], ["installer", "installer"]]) {
  const certificate = new crypto.X509Certificate(readFileSync(join(directory, `${prefix}.cert.pem`)));
  const expectedType = name === "application"
    ? /CN=(?:3rd Party Mac Developer Application:|Apple Distribution:)/
    : /CN=(?:3rd Party Mac Developer Installer:|Mac Installer Distribution:)/;
  if (!expectedType.test(certificate.subject)) throw new Error(`${name} certificate has the wrong distribution type`);
  const privateKey = crypto.createPrivateKey(readFileSync(join(directory, `${prefix}.key.pem`)));
  if (!publicKey(certificate.toString()).equals(publicKey(privateKey))) throw new Error(`${name} certificate/private key mismatch`);
  if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) throw new Error(`${name} certificate is not currently valid`);
  const pkcs12 = ["pkcs12", "-in", join(directory, `${prefix}.p12`), "-passin", `file:${passwordFile}`];
  privateExec("/usr/bin/openssl", [...pkcs12, "-noout"]);
  const bundledCertificate = new crypto.X509Certificate(privateExec("/usr/bin/openssl", [...pkcs12, "-clcerts", "-nokeys"]));
  const bundledKey = crypto.createPrivateKey(privateExec("/usr/bin/openssl", [...pkcs12, "-nocerts", "-nodes"]));
  if (!certificate.raw.equals(bundledCertificate.raw) || !publicKey(bundledKey).equals(publicKey(privateKey))) {
    throw new Error(`${name} PKCS12 does not contain the verified certificate and private key`);
  }
  certificates[name] = certificate;
}
const profileXml = execFileSync("security", ["cms", "-D", "-i", join(directory, "Launchpane.provisionprofile")], { stdio: "pipe" });
const profile = JSON.parse(execFileSync("python3", ["-c",
  "import sys,plistlib,json,base64,datetime; print(json.dumps(plistlib.loads(sys.stdin.buffer.read()), default=lambda v: v.replace(tzinfo=datetime.timezone.utc).isoformat() if isinstance(v,datetime.datetime) else base64.b64encode(v).decode()))",
], { input: profileXml }));
const team = profile.Entitlements["com.apple.developer.team-identifier"];
if (profile.Entitlements["com.apple.application-identifier"] !== `${team}.com.webmaxru.launchpane`
    || profile.Entitlements["com.apple.security.get-task-allow"] === true
    || profile.ProvisionedDevices || profile.ProvisionsAllDevices
    || !profile.Platform?.includes("OSX")
    || Date.parse(profile.ExpirationDate) <= Date.now()) throw new Error("Profile is not a valid Mac App Store distribution profile for Launchpane");
if (!profile.DeveloperCertificates.some(value => Buffer.from(value, "base64").equals(certificates.application.raw))) {
  throw new Error("Profile does not contain the application signing certificate");
}
if (!certificates.application.subject.includes(`OU=${team}`) || !certificates.installer.subject.includes(`OU=${team}`)) {
  throw new Error("Signing certificates do not match the profile team");
}
const now = Math.floor(Date.now() / 1000);
const input = `${Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ iss: issuer, iat: now, exp: now + 900, aud: "appstoreconnect-v1" })).toString("base64url")}`;
const signature = crypto.sign(null, Buffer.from(input), { key: readFileSync(keyPath), dsaEncoding: "ieee-p1363" });
async function apple(endpoint) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${endpoint}`, {
    headers: { Authorization: `Bearer ${input}.${signature.toString("base64url")}` },
  });
  if (!response.ok) throw new Error(`Apple API access failed: HTTP ${response.status}`);
  return response.json();
}
const apps = await apple("/v1/apps?filter[bundleId]=com.webmaxru.launchpane");
if (apps.data.length !== 1) throw new Error("Cannot identify exactly one Launchpane app record");
const appId = apps.data[0].id;
const versions = await apple(`/v1/apps/${appId}/appStoreVersions?filter[platform]=MAC_OS&limit=200`);
let contact;
for (const version of versions.data) {
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/appStoreVersions/${version.id}/appStoreReviewDetail`, {
    headers: { Authorization: `Bearer ${input}.${signature.toString("base64url")}` },
  });
  if (response.status === 404) continue;
  if (!response.ok) throw new Error(`Cannot read existing review contact: HTTP ${response.status}`);
  const attributes = (await response.json()).data?.attributes;
  if (attributes && ["contactFirstName", "contactLastName", "contactEmail", "contactPhone"].every(field => attributes[field])) {
    contact = attributes;
    break;
  }
}
if (!contact) throw new Error("No complete existing Apple review contact; configure approved contact details before provisioning");
Object.assign(secrets, {
  MACOS_APPLICATION_CERTIFICATE_PASSWORD: password,
  MACOS_INSTALLER_CERTIFICATE_PASSWORD: password,
  APP_STORE_CONNECT_API_KEY_ID: keyId,
  APP_STORE_CONNECT_API_ISSUER_ID: issuer,
  APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64: readFileSync(keyPath).toString("base64"),
  APP_REVIEW_FIRST_NAME: contact.contactFirstName,
  APP_REVIEW_LAST_NAME: contact.contactLastName,
  APP_REVIEW_EMAIL: contact.contactEmail,
  APP_REVIEW_PHONE: contact.contactPhone,
});
if (apply) {
  const endpoint = `repos/${repo}/environments/mac-app-store`;
  let existing;
  try {
    existing = jsonGh(["--method", "GET", endpoint]);
  } catch (error) {
    if (!String(error.stderr).includes("(HTTP 404)")) throw error;
    existing = { protection_rules: [] };
  }
  const reviewRule = existing.protection_rules?.find(rule => rule.type === "required_reviewers");
  // Preserve any configured reviewer rules when restricting deployment refs.
  jsonGh(["--method", "PUT", endpoint], {
    reviewers: reviewRule?.reviewers?.map(({ type, reviewer }) => ({ type, id: reviewer.id })),
    wait_timer: existing.protection_rules?.find(rule => rule.type === "wait_timer")?.wait_timer ?? 0,
    prevent_self_review: reviewRule?.prevent_self_review,
    can_admins_bypass: existing.can_admins_bypass,
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  });
  const policies = jsonGh(["--method", "GET", `${endpoint}/deployment-branch-policies`]).branch_policies;
  if (!policies.some(policy => policy.name === "v*" && policy.type === "tag")) {
    jsonGh(["--method", "POST", `${endpoint}/deployment-branch-policies`], { name: "v*", type: "tag" });
  }
  for (const [name, value] of Object.entries(secrets)) {
    gh(["secret", "set", name, "--repo", repo, "--env", "mac-app-store"], value);
  }
  gh(["variable", "set", "ASC_APP_ID", "--repo", repo, "--env", "mac-app-store", "--body", appId]);
  console.log("Configured mac-app-store: tag policy v*, verified app record, and all 12 required secrets.");
} else {
  console.log("Validated Store certificate/key pairs, export passwords, distribution profile, Apple API access, app record, and existing review contact. No GitHub settings changed.");
}
