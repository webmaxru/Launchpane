# App Sandbox exception justification

Launchpane is a focused macOS utility for inspecting launch agents, launch
daemons, and application login-item helpers. Its core purpose requires reading
the standard locations where macOS and third-party software install these
definitions. The Mac App Store build has no administrator mode; system agents
and daemons remain read-only.

## `com.apple.security.temporary-exception.files.home-relative-path.read-write`

Value: `/Library/LaunchAgents/`

Launchpane creates and edits launch-agent property lists selected by the user
inside `~/Library/LaunchAgents`. To assess the exception, create a user launch
agent in Launchpane, save it, and confirm the resulting property list in that
directory. Launchpane does not request access to other home-relative paths.

## `com.apple.security.temporary-exception.files.home-relative-path.read-only`

Value: `/Applications/`

Launchpane includes app bundles installed in `~/Applications` when discovering
login-item helpers. This access is read-only and is limited to application
bundle metadata and `Contents/Library/LoginItems`.

## `com.apple.security.temporary-exception.files.absolute-path.read-only`

Values:

- `/Library/LaunchAgents/`
- `/Library/LaunchDaemons/`
- `/System/Library/LaunchAgents/`
- `/System/Library/LaunchDaemons/`
- `/Applications/`

Launchpane reads system launch definitions and discovers application login-item
helpers under standard application bundles. System entries are presented as
read-only. The `/Applications/` exception is used only to inspect
`Contents/Library/LoginItems` and the helpers' bundle metadata.

These exceptions are visible in `src-tauri/entitlements/app-store.plist`.
Apple may require a Feedback Assistant ID before approving temporary
exceptions. Add that ID to the App Store Connect sandbox usage information
before submission.
