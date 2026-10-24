"""Allow only justified, minimal App Store entitlements, including signed output."""

import argparse
import plistlib
import subprocess
from pathlib import Path


# Every entitlement must map to functionality the Store edition actually ships.
# Apple rejects entitlements without matching functionality (2.4.5(i)), so a
# new key needs a justification here, native removal testing, and review notes.
REQUIRED = {
    "com.apple.security.app-sandbox":
        "Mac App Store apps must run in App Sandbox.",
    "com.apple.security.network.client":
        "Tauri's WKWebView content process renders a blank window in the "
        "sandbox without it (verified by removal on macOS 12.7.6).",
    "com.apple.security.files.user-selected.read-write":
        "Folders the user grants through the native Open panel are read and "
        "personal plists in them are created/edited.",
    "com.apple.security.files.bookmarks.app-scope":
        "Security-scoped bookmarks of the folders chosen in the Open panel "
        "restore the same user-granted access after relaunch instead of "
        "asking again. Apple documents it as required for app-scoped "
        "security-scoped bookmarks; a local ad-hoc removal test on macOS "
        "12.7.6 did not enforce it, so confirm on the distribution build "
        "(see appstore/sandbox-exceptions.md).",
}
SIGNING = {
    "com.apple.application-identifier": "Added by distribution signing.",
    "com.apple.developer.team-identifier": "Added by distribution signing.",
}
FORBIDDEN = {
    "com.apple.security.get-task-allow":
        "Debug entitlement; App Review rejects either value.",
    "com.apple.security.network.server":
        "Launchpane never listens for incoming connections; App Review "
        "rejected it as unused.",
}
FORBIDDEN_PREFIXES = ("com.apple.security.temporary-exception.",)


def verify(entitlements, signed=False):
    required = set(REQUIRED)
    allowed = required | set(SIGNING)
    forbidden = sorted(
        key for key in entitlements
        if key in FORBIDDEN or key.startswith(FORBIDDEN_PREFIXES)
    )
    if forbidden:
        reasons = "; ".join(f"{key}: {FORBIDDEN.get(key, 'temporary exceptions are not permitted')}" for key in forbidden)
        raise ValueError(f"Forbidden Store entitlements: {reasons}")
    unexpected = entitlements.keys() - allowed
    if unexpected:
        raise ValueError(f"Disallowed Store entitlements: {', '.join(sorted(unexpected))}")
    for key in required:
        if entitlements.get(key) is not True:
            raise ValueError(f"{key} must be Boolean true")
    if signed:
        team = entitlements.get("com.apple.developer.team-identifier")
        if not isinstance(team, str) or not team:
            raise ValueError("Signed app is missing its team identifier")
        if entitlements.get("com.apple.application-identifier") != f"{team}.com.webmaxru.launchpane":
            raise ValueError("Signed app identifier does not match its team and bundle")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plist", type=Path)
    parser.add_argument("--signed", action="store_true")
    parser.add_argument("--app", type=Path)
    args = parser.parse_args()
    # Older macOS codesign emits a NUL-terminated XML entitlement blob.
    verify(plistlib.loads(args.plist.read_bytes().rstrip(b"\0")), args.signed)
    if args.app:
        for path in (args.app / "Contents").rglob("*"):
            if not path.is_file() or path.is_symlink():
                continue
            # Only Mach-O executables need their own sandbox entitlements.
            with path.open("rb") as file:
                magic = file.read(4)
            if magic not in (
                b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe",
                b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe",
                b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca",
                b"\xca\xfe\xba\xbf", b"\xbf\xba\xfe\xca",
            ):
                continue
            description = subprocess.check_output(["/usr/bin/file", str(path)], text=True)
            if "executable" not in description:
                continue
            architectures = subprocess.check_output(
                ["/usr/bin/lipo", "-archs", str(path)], text=True,
            ).split()
            for architecture in architectures:
                result = subprocess.run(
                    ["/usr/bin/codesign", "--display", "--arch", architecture,
                     "--entitlements", ":-", str(path)],
                    check=True, capture_output=True,
                )
                verify(plistlib.loads(result.stdout.rstrip(b"\0")), signed=True)
    print("Store entitlements verified: only justified minimal entitlements: " + ", ".join(sorted(REQUIRED)))


if __name__ == "__main__":
    main()
