import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const environments = {
  "macos-distribution": {
    secrets: [
      "DEVELOPER_ID_CERTIFICATE_BASE64", "DEVELOPER_ID_CERTIFICATE_PASSWORD",
      "APPLE_SIGNING_IDENTITY", "APPLE_API_KEY", "APPLE_API_ISSUER",
      "APPLE_API_PRIVATE_KEY_BASE64",
    ],
    variables: [],
  },
  "mac-app-store": {
    secrets: [
      "MACOS_APPLICATION_CERTIFICATE_BASE64", "MACOS_APPLICATION_CERTIFICATE_PASSWORD",
      "MACOS_INSTALLER_CERTIFICATE_BASE64", "MACOS_INSTALLER_CERTIFICATE_PASSWORD",
      "MACOS_PROVISIONING_PROFILE_BASE64", "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID", "APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64",
      "APP_REVIEW_FIRST_NAME", "APP_REVIEW_LAST_NAME", "APP_REVIEW_PHONE", "APP_REVIEW_EMAIL",
    ],
    variables: ["ASC_APP_ID"],
  },
};

export function missingNames(expected, actual) {
  const names = new Set(actual.map(item => item.name));
  return expected.filter(name => !names.has(name));
}

export async function main() {
  if (process.argv.slice(2).some(argument => argument !== "--captures")) throw new Error("Usage: check-release-environments.mjs [--captures]");
  const repo = process.env.GH_REPO || "webmaxru/Launchpane";
  for (const [name, required] of Object.entries(environments)) {
    const endpoint = `repos/${repo}/environments/${name}`;
    const api = suffix => JSON.parse(execFileSync("gh", ["api", `${endpoint}${suffix}`], { encoding: "utf8" }));
    api("");
    const secretNames = JSON.parse(execFileSync("gh", ["secret", "list", "--repo", repo, "--env", name, "--json", "name"], { encoding: "utf8" }));
    const variableNames = JSON.parse(execFileSync("gh", ["variable", "list", "--repo", repo, "--env", name, "--json", "name"], { encoding: "utf8" }));
    const missing = [...missingNames(required.secrets, secretNames), ...missingNames(required.variables, variableNames)];
    if (missing.length) throw new Error(`${name} is missing: ${missing.join(", ")}`);
    const policies = api("/deployment-branch-policies").branch_policies;
    if (!policies.some(policy => policy.type === "tag" && policy.name === "v*")) throw new Error(`${name} needs a v* tag deployment policy`);
    console.log(`${name}: required secret/variable names and release-tag policy present`);
  }
  if (process.argv.includes("--captures")) {
    const { readCaptureManifest } = await import("./store-screenshot-source.ts");
    readCaptureManifest(process.cwd());
    console.log("Store capture provenance matches the current app source/version");
  }
  console.log("Environment configuration checked; credential validity and Apple access still require live signing/API checks.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
