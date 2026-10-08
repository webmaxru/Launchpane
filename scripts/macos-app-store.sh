#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${MACOS_APP_STORE_TARGET:-universal-apple-darwin}"
APP_PATH="$ROOT/src-tauri/target/$TARGET/release/bundle/macos/Launchpane.app"
OUTPUT_DIR="$ROOT/release/appstore"
PKG_PATH="$OUTPUT_DIR/Launchpane.pkg"
BASE_ENTITLEMENTS="$ROOT/src-tauri/entitlements/app-store.plist"
PROFILE_PATH="${MACOS_PROVISIONING_PROFILE_PATH:-$ROOT/secrets/Launchpane.provisionprofile}"
BUILD_NUMBER="${APP_BUILD_NUMBER:-$(date -u +%Y%m%d%H%M)}"

fail() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null || fail "Required command not found: $1"
}

identity() {
  local env_name="$1"
  local pattern="$2"
  local value="${!env_name:-}"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return
  fi
  security find-identity -v -p codesigning | sed -n "s/.*\"\($pattern[^\"]*\)\".*/\1/p" | head -1
}

installer_identity() {
  if [[ -n "${MACOS_INSTALLER_SIGNING_IDENTITY:-}" ]]; then
    printf '%s' "$MACOS_INSTALLER_SIGNING_IDENTITY"
    return
  fi
  local value
  value=$(security find-certificate -a -c "Mac Installer Distribution" -Z |
    sed -n 's/.*"alis"<blob>="\([^"]*\)".*/\1/p' | head -1)
  if [[ -z "$value" ]]; then
    value=$(security find-certificate -a -c "3rd Party Mac Developer Installer" -Z |
      sed -n 's/.*"alis"<blob>="\([^"]*\)".*/\1/p' | head -1)
  fi
  printf '%s' "$value"
}

build_app() {
  require_command pnpm
  if command -v rustup >/dev/null; then
    rustup target add aarch64-apple-darwin x86_64-apple-darwin
  fi
  cd "$ROOT"
  pnpm exec tauri build \
    --target "$TARGET" \
    --bundles app \
    --features app-store \
    --config src-tauri/tauri.app-store.conf.json
  [[ -d "$APP_PATH" ]] || fail "Universal app bundle not found at $APP_PATH"
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$APP_PATH/Contents/Info.plist"
}

sign_app() {
  require_command security
  require_command codesign
  [[ -d "$APP_PATH" ]] || fail "Build the App Store app first"
  [[ -f "$PROFILE_PATH" ]] || fail "Provisioning profile not found: $PROFILE_PATH"

  local application_identity
  application_identity="$(identity MACOS_APPLICATION_SIGNING_IDENTITY 'Apple Distribution:')"
  if [[ -z "$application_identity" ]]; then
    application_identity="$(identity MACOS_APPLICATION_SIGNING_IDENTITY '3rd Party Mac Developer Application:')"
  fi
  [[ -n "$application_identity" ]] || fail "Mac App Distribution signing identity not found"

  local profile_plist generated_entitlements application_identifier team_identifier
  profile_plist="$(mktemp)"
  generated_entitlements="$(mktemp)"
  trap 'rm -f "$profile_plist" "$generated_entitlements"' RETURN

  security cms -D -i "$PROFILE_PATH" > "$profile_plist"
  application_identifier=$(/usr/libexec/PlistBuddy -c "Print :Entitlements:com.apple.application-identifier" "$profile_plist")
  team_identifier=$(/usr/libexec/PlistBuddy -c "Print :Entitlements:com.apple.developer.team-identifier" "$profile_plist")
  [[ "$application_identifier" == *".com.webmaxru.launchpane" ]] ||
    fail "Provisioning profile does not match com.webmaxru.launchpane"

  cp "$BASE_ENTITLEMENTS" "$generated_entitlements"
  /usr/libexec/PlistBuddy -c "Add :com.apple.application-identifier string $application_identifier" "$generated_entitlements"
  /usr/libexec/PlistBuddy -c "Add :com.apple.developer.team-identifier string $team_identifier" "$generated_entitlements"
  /usr/libexec/PlistBuddy -c "Add :com.apple.security.get-task-allow bool false" "$generated_entitlements"

  cp "$PROFILE_PATH" "$APP_PATH/Contents/embedded.provisionprofile"
  codesign --force --timestamp --options runtime \
    --entitlements "$generated_entitlements" \
    --sign "$application_identity" \
    "$APP_PATH"
}

package_app() {
  require_command productbuild
  mkdir -p "$OUTPUT_DIR"
  local installer_identity
  installer_identity="$(installer_identity)"
  [[ -n "$installer_identity" ]] || fail "Mac Installer Distribution signing identity not found"

  rm -f "$PKG_PATH"
  productbuild \
    --component "$APP_PATH" /Applications \
    --sign "$installer_identity" \
    --timestamp \
    "$PKG_PATH"
}

verify_package() {
  [[ -f "$PKG_PATH" ]] || fail "Signed installer package not found: $PKG_PATH"
  codesign --verify --deep --strict --verbose=2 "$APP_PATH"
  codesign --display --entitlements :- "$APP_PATH" > "$OUTPUT_DIR/signed-entitlements.plist"
  pkgutil --check-signature "$PKG_PATH"
  # Gatekeeper assesses Developer ID distribution, so it always rejects a Mac
  # App Store package. Report the result without failing the build.
  spctl --assess --type install --verbose=2 "$PKG_PATH" || \
    echo "note: spctl rejects Mac App Store packages by design; signature verified above"
}

validate_with_apple() {
  [[ -n "${APP_STORE_CONNECT_API_KEY_ID:-}" ]] || fail "APP_STORE_CONNECT_API_KEY_ID is required"
  [[ -n "${APP_STORE_CONNECT_API_ISSUER_ID:-}" ]] || fail "APP_STORE_CONNECT_API_ISSUER_ID is required"
  xcrun altool --validate-app \
    --file "$PKG_PATH" \
    --type macos \
    --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID"
}

case "${1:-all}" in
  build) build_app ;;
  sign) sign_app ;;
  package) package_app ;;
  verify) verify_package ;;
  validate) validate_with_apple ;;
  all)
    build_app
    sign_app
    package_app
    verify_package
    ;;
  *) fail "Usage: $0 {build|sign|package|verify|validate|all}" ;;
esac
