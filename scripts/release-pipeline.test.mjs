import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
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
test("Store screenshot renderer emits RGB PNGs without an alpha channel", { skip: process.platform !== "darwin" }, t => {
  const directory = mkdtempSync(join(tmpdir(), "launchpane-opaque-screenshot-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = join(directory, "nested", "opaque.png");
  execFileSync("/usr/bin/swift", [resolve("scripts/render-store-screenshots.swift")], {
    input: JSON.stringify([{ source: resolve("branding/screenshots/source/overview.png"), output, width: 128, height: 80 }]),
  });
  const png = readFileSync(output);
  assert.equal(png.readUInt32BE(16), 128);
  assert.equal(png.readUInt32BE(20), 80);
  assert.equal(png[25], 2, "PNG color type must be truecolor RGB, never RGBA");
  assert.match(execFileSync("/usr/bin/sips", ["-g", "hasAlpha", output]).toString(), /hasAlpha: no/);
});
test("Store entitlements reject every rejected exception and either debug value", t => {
  const directory = mkdtempSync(join(tmpdir(), "launchpane-entitlements-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const script = resolve("scripts/verify-store-entitlements.py");
  const source = resolve("src-tauri/entitlements/app-store.plist");
  assert.match(execFileSync("python3", [script, source]).toString(), /verified/);
  const nulTerminated = join(directory, "codesign-output.plist");
  writeFileSync(nulTerminated, Buffer.concat([readFileSync(source), Buffer.from([0])]));
  assert.match(execFileSync("python3", [script, nulTerminated]).toString(), /verified/);
  const generate = `
import plistlib, sys
with open(sys.argv[1], "rb") as f:
    entitlements = plistlib.load(f)
entitlements[sys.argv[3]] = plistlib.loads(sys.argv[4].encode())
with open(sys.argv[2], "wb") as f:
    plistlib.dump(entitlements, f)
`;
  for (const [key, value] of [
    ["com.apple.security.get-task-allow", "<false/>"],
    ["com.apple.security.get-task-allow", "<true/>"],
    ["com.apple.security.temporary-exception.files.absolute-path.read-only", "<array><string>/Library/LaunchAgents/</string><string>/Library/LaunchDaemons/</string><string>/Applications/</string></array>"],
    ["com.apple.security.temporary-exception.files.home-relative-path.read-write", "<array><string>/Library/LaunchAgents/</string></array>"],
    ["com.apple.security.temporary-exception.files.home-relative-path.read-only", "<array><string>/Applications/</string></array>"],
    ["com.apple.security.app-sandbox", "<false/>"],
  ]) {
    const path = join(directory, "invalid.plist");
    execFileSync("python3", ["-c", generate, source, path, key, `<plist version="1.0">${value}</plist>`]);
    assert.notEqual(spawnSync("python3", [script, path]).status, 0, key);
  }
  assert.doesNotMatch(readFileSync("scripts/macos-app-store.sh", "utf8"), /Add :com.apple.security.get-task-allow/);
  assert.match(readFileSync("scripts/macos-app-store.sh", "utf8"), /--signed --app "\$APP_PATH"/);
  assert.notEqual(spawnSync("python3", [script, source, "--signed"]).status, 0, "signed identity required");
  const signed = join(directory, "signed.plist");
  execFileSync("python3", ["-c", `
import plistlib, sys
with open(sys.argv[1], "rb") as f:
    entitlements = plistlib.load(f)
entitlements["com.apple.developer.team-identifier"] = "TESTTEAM"
entitlements["com.apple.application-identifier"] = "TESTTEAM.com.webmaxru.launchpane"
with open(sys.argv[2], "wb") as f:
    plistlib.dump(entitlements, f)
`, source, signed]);
  assert.match(execFileSync("python3", [script, signed, "--signed"]).toString(), /verified/);
  execFileSync("python3", ["-c", generate, signed, signed, "com.apple.application-identifier", '<plist version="1.0"><string>OTHER.com.webmaxru.launchpane</string></plist>']);
  assert.notEqual(spawnSync("python3", [script, signed, "--signed"]).status, 0, "team mismatch rejected");
});
test("Store packaging makes a private source profile readable before signing", t => {
  const directory = mkdtempSync(join(tmpdir(), "launchpane-profile-permissions-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, "private.provisionprofile");
  const app = join(directory, "Launchpane.app");
  mkdirSync(join(app, "Contents"), { recursive: true });
  writeFileSync(source, "profile fixture", { mode: 0o600 });
  const script = readFileSync("scripts/macos-app-store.sh", "utf8");
  const stage = script.match(/^  cp "\$PROFILE_PATH" "\$APP_PATH\/Contents\/embedded.provisionprofile"\n  chmod 0644 "\$APP_PATH\/Contents\/embedded.provisionprofile"$/m)?.[0];
  assert.ok(stage, "Production staging must explicitly normalize public profile permissions");
  execFileSync("bash", ["-c", stage], {
    env: { ...process.env, PROFILE_PATH: source, APP_PATH: app },
  });
  assert.equal(statSync(source).mode & 0o777, 0o600, "Do not weaken private signing inputs");
  assert.equal(statSync(join(app, "Contents/embedded.provisionprofile")).mode & 0o777, 0o644);
  assert.ok(script.includes('find "$APP_PATH" -type f ! -perm -004 -print -quit'));
  assert.ok(script.includes('find "$APP_PATH" -type d ! -perm -005 -print -quit'));
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
  assert.match(workflow, /API_KEY_PATH="\$GITHUB_WORKSPACE\/private_keys\/AuthKey_\$\{ASC_KEY_ID\}\.p8"/);
  assert.match(workflow, /mkdir -p "\$GITHUB_WORKSPACE\/private_keys"/);
  assert.match(workflow, /if \[\[ -n "\$\{ASC_KEY_PATH:-\}" \]\]; then rm -f "\$ASC_KEY_PATH"; fi/);
  assert.ok(workflow.indexOf("--preflight") < workflow.indexOf("pnpm appstore:build"));
  assert.match(workflow, /rm -f "\$RUNNER_TEMP\/application.p12" "\$RUNNER_TEMP\/installer.p12"/);
  assert.doesNotMatch(workflow, /github.run_number|SUBMIT_FOR_REVIEW|automatic_release:/);
});
