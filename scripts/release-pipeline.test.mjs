import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { test } from "node:test";
import { environments, missingNames } from "./check-release-environments.mjs";

test("both release environments have separate required credential contracts", () => {
  assert.equal(environments["macos-distribution"].secrets.length, 6);
  assert.equal(environments["mac-app-store"].secrets.length, 12);
  assert.deepEqual(environments["mac-app-store"].variables, ["ASC_APP_ID"]);
  assert.deepEqual(missingNames(["present", "missing"], [{ name: "present" }]), ["missing"]);
});
test("source verifier rejects mismatched manifests and invalid build numbers", t => {
  const directory = mkdtempSync(join(tmpdir(), "launchpane-release-source-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, "src-tauri"));
  writeFileSync(join(directory, "package.json"), JSON.stringify({ version: "9.8.7" }));
  writeFileSync(join(directory, "src-tauri/tauri.conf.json"), JSON.stringify({ version: "9.8.7" }));
  writeFileSync(join(directory, "src-tauri/Cargo.toml"), 'version = "9.8.7"\n');
  writeFileSync(join(directory, "src-tauri/Cargo.lock"), 'name = "launchpane"\nversion = "9.8.7"\n');
  const script = resolve("scripts/verify-release-source.mjs");
  const options = { cwd: directory, env: { ...process.env, RELEASE_TAG: "v9.8.7", APP_BUILD_NUMBER: "202610120003" } };
  assert.match(execFileSync("node", [script], options).toString(), /Verified/);
  assert.notEqual(spawnSync("node", [script], { ...options, env: { ...options.env, APP_BUILD_NUMBER: "1;echo bad" } }).status, 0);
  writeFileSync(join(directory, "src-tauri/Cargo.lock"), 'name = "launchpane"\nversion = "9.8.6"\n');
  assert.notEqual(spawnSync("node", [script], options).status, 0);
});
test("Store workflow has immutable source, explicit build number, safe upload, and secret cleanup", () => {
  const workflow = readFileSync(".github/workflows/appstore-release.yml", "utf8");
  assert.match(workflow, /environment: mac-app-store/);
  assert.match(workflow, /ASC_APP_ID: \$\{\{ vars.ASC_APP_ID \}\}/);
  assert.match(workflow, /APP_BUILD_NUMBER: \$\{\{ inputs.build_number \}\}/);
  assert.match(workflow, /ASC_SUBMIT: "false"/);
  assert.match(workflow, /ASC_AUTOMATIC_RELEASE: "false"/);
  assert.match(workflow, /test "\$WORKFLOW_REF" = "\$RELEASE_TAG"/);
  assert.match(workflow, /--preflight/);
  assert.ok(workflow.indexOf("--preflight") < workflow.indexOf("pnpm appstore:build"));
  assert.match(workflow, /rm -f "\$RUNNER_TEMP\/application.p12" "\$RUNNER_TEMP\/installer.p12"/);
  assert.doesNotMatch(workflow, /github.run_number|SUBMIT_FOR_REVIEW|automatic_release:/);
});
