"""Reject App Store entitlements known to fail review, including signed output."""

import argparse
import plistlib
import subprocess
from pathlib import Path


def verify(entitlements, signed=False):
    required = {
        "com.apple.security.app-sandbox",
        "com.apple.security.network.client",
        "com.apple.security.network.server",
        "com.apple.security.files.user-selected.read-write",
    }
    allowed = required | {
        "com.apple.application-identifier",
        "com.apple.developer.team-identifier",
    }
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
    print("Store entitlements verified: no debug entitlement or temporary file exceptions")


if __name__ == "__main__":
    main()
