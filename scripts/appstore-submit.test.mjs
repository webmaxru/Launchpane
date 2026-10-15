import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, after, beforeEach } from "node:test";

const directory = mkdtempSync(join(tmpdir(), "launchpane-apple-tests-"));
const key = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
writeFileSync(join(directory, "key.p8"), key.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
const originalEnv = { ...process.env };
Object.assign(process.env, {
  ASC_KEY_ID: "test-key", ASC_ISSUER_ID: "test-issuer",
  ASC_KEY_PATH: join(directory, "key.p8"), ASC_APP_ID: "test-app",
  ASC_SUBMIT: "false", ASC_AUTOMATIC_RELEASE: "false",
});
const { editableVersion, preflight, uploadBuild, booleanSetting } = await import("./appstore-submit.mjs");
const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
const nativeFetch = globalThis.fetch;
let calls;
let handler;
const page = data => ({ data });
beforeEach(() => {
  calls = [];
  handler = () => { throw new Error("Unexpected fake Apple request"); };
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, method: options.method || "GET", body });
    const result = handler(new URL(url), options.method || "GET", body);
    return new Response(JSON.stringify(result), { status: 200 });
  };
});
after(() => {
  globalThis.fetch = nativeFetch;
  for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name];
  Object.assign(process.env, originalEnv);
  rmSync(directory, { recursive: true, force: true });
});
function inventory(url) {
  if (url.pathname === "/v1/apps/test-app") return { data: { attributes: { bundleId: "com.webmaxru.launchpane" } } };
  if (url.pathname.endsWith("/appStoreVersions")) return page([]);
  if (url.pathname.endsWith("/builds")) return page([]);
  if (url.pathname.endsWith("/buildUploads")) return page([]);
  throw new Error(`Unexpected request: ${url.pathname}`);
}

test("submission and automatic release are opt-in booleans", () => {
  delete process.env.TEST_RELEASE_FLAG;
  assert.equal(booleanSetting("TEST_RELEASE_FLAG"), false);
  process.env.TEST_RELEASE_FLAG = "true";
  assert.equal(booleanSetting("TEST_RELEASE_FLAG"), true);
  process.env.TEST_RELEASE_FLAG = "yes";
  assert.throws(() => booleanSetting("TEST_RELEASE_FLAG"), /true or false/);
  delete process.env.TEST_RELEASE_FLAG;
});
test("creates the intended version without renaming a historical public release", async () => {
  handler = (url, method, body) => {
    if (method === "GET") return page([{ id: "old", attributes: { versionString: "1.2.1", appStoreState: "READY_FOR_SALE" } }]);
    assert.equal(method, "POST");
    assert.equal(url.pathname, "/v1/appStoreVersions");
    assert.equal(body.data.attributes.versionString, version);
    assert.equal(body.data.attributes.releaseType, "MANUAL");
    return { data: { id: "new" } };
  };
  assert.equal(await editableVersion(), "new");
  assert.equal(calls.filter(call => call.method === "PATCH").length, 0);
});
test("blocks an unrelated pending version before uploading or editing anything", async () => {
  handler = url => url.pathname.endsWith("/appStoreVersions")
    ? page([{ id: "old", attributes: { versionString: "1.2.1", appStoreState: "WAITING_FOR_REVIEW" } }])
    : inventory(url);
  await assert.rejects(preflight("202610120003"), /resolve it before creating/);
  assert.ok(calls.every(call => call.method === "GET"));
});
test("updates only the intended editable version with manual release", async () => {
  handler = (url, method, body) => {
    if (method === "GET") return page([{ id: "target", attributes: { versionString: version, appStoreState: "PREPARE_FOR_SUBMISSION" } }]);
    assert.equal(url.pathname, "/v1/appStoreVersions/target");
    assert.equal(body.data.attributes.releaseType, "MANUAL");
    assert.equal(body.data.attributes.versionString, undefined);
    return { data: { id: "target" } };
  };
  assert.equal(await editableVersion(), "target");
});
test("does not alter an in-review version", async () => {
  handler = () => page([{ id: "target", attributes: { versionString: version, appStoreState: "IN_REVIEW" } }]);
  await assert.rejects(editableVersion(), /not editable/);
  assert.equal(calls.length, 1);
});
test("preflight checks the app bundle before any mutation", async () => {
  handler = () => ({ data: { attributes: { bundleId: "wrong.bundle" } } });
  await assert.rejects(preflight("202610120001"), /different bundle/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});
test("checks all pages for used or non-monotonic build numbers", async () => {
  handler = url => {
    if (url.pathname.endsWith("/builds")) return { data: [], links: { next: "https://api.appstoreconnect.apple.com/v1/second-page" } };
    if (url.pathname === "/v1/second-page") return page([{ attributes: { version: "202610120002" } }]);
    return inventory(url);
  };
  await assert.rejects(preflight("202610120001"), /exceed all existing/);
  assert.ok(calls.some(call => call.url.endsWith("/v1/second-page")));
  assert.ok(calls.every(call => call.method === "GET"));
});
test("rejects an existing upload number even when no processed build exists", async () => {
  handler = url => url.pathname.endsWith("/buildUploads")
    ? page([{ attributes: { cfBundleVersion: "202610120001" } }]) : inventory(url);
  await assert.rejects(preflight("202610120001"), /do not reuse/);
});
test("does not forward credentials through untrusted pagination URLs", async () => {
  handler = url => url.pathname.endsWith("/builds")
    ? { data: [], links: { next: "https://unexpected.example/v1/builds" } } : inventory(url);
  await assert.rejects(preflight(), /unexpected API origin/);
  assert.ok(calls.every(call => call.url.startsWith("https://api.appstoreconnect.apple.com/")));
});
test("uploads a fresh package and returns only the exact VALID macOS build", async () => {
  const packagePath = join(directory, "fixture.pkg");
  writeFileSync(packagePath, "test");
  let uploaded = false;
  handler = (url, method, body) => {
    if (url.hostname === "upload.example.test") {
      assert.equal(method, "PUT");
      return {};
    }
    if (url.pathname === "/v1/buildUploads" && method === "POST") {
      assert.equal(body.data.attributes.cfBundleShortVersionString, version);
      return { data: { id: "upload" } };
    }
    if (url.pathname === "/v1/buildUploadFiles" && method === "POST") {
      return { data: { id: "file", attributes: { uploadOperations: [{ url: "https://upload.example.test/file", method: "PUT", offset: 0, length: 4 }] } } };
    }
    if (url.pathname === "/v1/buildUploadFiles/file" && method === "PATCH") {
      uploaded = true;
      return {};
    }
    if (url.pathname === "/v1/buildUploads/upload") return { data: { attributes: { state: { state: "COMPLETE" } } } };
    if (url.pathname === "/v1/preReleaseVersions/prerelease") return { data: { attributes: { version, platform: "MAC_OS" } } };
    if (url.pathname.endsWith("/builds") && uploaded) {
      assert.equal(url.pathname, "/v1/builds", "The app relationship endpoint does not support include");
      assert.equal(url.searchParams.get("filter[app]"), "test-app");
      assert.equal(url.searchParams.get("include"), "preReleaseVersion");
      return page([{
        id: "build", attributes: { version: "202610120003", processingState: "VALID" },
        relationships: { preReleaseVersion: { data: { id: "prerelease" } } },
      }]);
    }
    return inventory(url);
  };
  // Upload requests carry binary bodies, not JSON.
  const fakeFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => url.startsWith("https://upload.example.test/")
    ? Promise.resolve(new Response(null, { status: 200 })) : fakeFetch(url, options);
  const build = await uploadBuild("202610120003", packagePath);
  assert.equal(build.id, "build");
  assert.ok(calls.every(call => !call.url.includes("relationships/build")));
});
test("Apple upload failure is explicit and does not change metadata", async () => {
  const packagePath = join(directory, "failed.pkg");
  writeFileSync(packagePath, "test");
  handler = (url, method) => {
    if (url.pathname === "/v1/buildUploads" && method === "POST") return { data: { id: "upload" } };
    if (url.pathname === "/v1/buildUploadFiles") return { data: { id: "file", attributes: { uploadOperations: [] } } };
    return inventory(url);
  };
  await assert.rejects(uploadBuild("202610120003", packagePath), /no upload operations/);
  assert.ok(calls.every(call => !(call.method === "PATCH" && call.url.includes("appStore"))));
});
