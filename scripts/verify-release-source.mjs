import { readFileSync } from "node:fs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const versions = [
  JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")).version,
  readFileSync("src-tauri/Cargo.toml", "utf8").match(/^version = "([^"]+)"$/m)?.[1],
  readFileSync("src-tauri/Cargo.lock", "utf8").match(/name = "launchpane"\nversion = "([^"]+)"/)?.[1],
];
if (!/^\d+\.\d+\.\d+$/.test(version) || process.env.RELEASE_TAG !== `v${version}`
    || versions.some(value => value !== version)) {
  throw new Error("Release tag and all four app versions must match exactly");
}
if (process.env.APP_BUILD_NUMBER && !/^[1-9]\d{0,17}$/.test(process.env.APP_BUILD_NUMBER)) {
  throw new Error("APP_BUILD_NUMBER must be a positive integer of at most 18 digits");
}
console.log(`Verified release ${process.env.RELEASE_TAG}`);
