# Article draft

An outline for a blog post, dev.to, or Hashnode. It's written to be useful to anyone who works
with launchd, whether or not they install Launchpane.

Before publishing:

- Rewrite it in your own voice. It was drafted with AI assistance, and some venues, such as
  This Week in Rust, don't accept LLM-written articles.
- Publish on a site you control first, then cross-post with the canonical URL set to the
  original.
- Use `assets/gallery/04-logs.png` or `assets/gallery/05-schedule.png` as the cover, or a
  1000×420 crop of either for dev.to.
- Link GitHub, not Product Hunt.

The example output below comes from the demo agents in `capture/demo-agents.sh`, captured on
macOS 12.7.6.

---

# What starts on your Mac? A practical tour of launchd

Almost everything that runs in the background on a Mac goes through launchd: sync helpers,
updaters, backup jobs, the scripts you scheduled two years ago and forgot. launchd starts
them when you log in, on a timer, when a file changes, or on demand, and it keeps their
definitions in a handful of folders.

This is a short tour of where those jobs live, how to read one, and the launchctl commands
that answer "is it running, and why did it fail?"

## Agents, daemons, and login items

- **Launch agents** run in a user's session, as that user, after they log in. They can
  show UI and talk to the user.
- **Launch daemons** run system-wide, without anyone logged in, as root or as the user named
  in the plist.
- **Login items** are helper apps that an app bundles inside itself and registers to start at
  login. On macOS 13 and later, System Settings → General → Login Items lists them alongside
  the agents and daemons that apps install.

## Where they live

| Folder | What's there | Who manages it |
| --- | --- | --- |
| `~/Library/LaunchAgents` | Agents for your account only | You |
| `/Library/LaunchAgents` | Agents that run for every user | Apps and administrators |
| `/Library/LaunchDaemons` | System-wide daemons | Apps and administrators |
| `/System/Library/LaunchAgents`, `/System/Library/LaunchDaemons` | Apple's own jobs | macOS; protected by System Integrity Protection |
| `<App>.app/Contents/Library/LoginItems/` | Login item helpers | The app that bundles them |

The first three are where third-party jobs end up. The `/System` folders are Apple's; leave
them alone.

## Reading a plist

Each job is a property list. Here's a small agent that runs a sync script every six hours
and writes its output to two log files:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.example.sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>/Users/you/bin/sync.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>21600</integer>
  <key>StandardOutPath</key>
  <string>/tmp/sync.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/sync.err.log</string>
</dict>
</plist>
```

The keys you'll see most often:

- `Label`: the job's unique name. Most launchctl commands use it.
- `ProgramArguments`: the executable and its arguments, as an array.
- `RunAtLoad`: start as soon as the job is loaded, usually at login.
- `StartInterval`: run every N seconds. If the Mac is asleep when an interval fires, that run
  is skipped.
- `StartCalendarInterval`: run at a calendar time, like cron. If the Mac was asleep, launchd
  runs the job once on wake, coalescing the missed runs.
- `KeepAlive`: restart the job when it exits, always or under conditions.
- `StandardOutPath` and `StandardErrorPath`: where output goes. Without them, a failing job
  often leaves nothing to read.
- `WorkingDirectory`: the folder the job starts in.

`man launchd.plist` documents every key.

## Domains and service targets

Modern launchctl commands address jobs by domain:

- `gui/<uid>` for agents in your login session. Your uid is `id -u`, often 501.
- `system` for daemons.

A service target is the domain plus the label, for example
`gui/501/com.example.sync`. The examples below use `gui/$(id -u)/…` so they work for any
account.

## The commands that answer most questions

Is it loaded, and what happened last time?

```sh
launchctl print gui/$(id -u)/com.example.sync
```

The output is long. These lines matter most:

```text
path = /Users/you/Library/LaunchAgents/com.example.sync.plist
state = not running
stderr path = /tmp/sync.err.log
runs = 2
last exit code = 1
run interval = 21600 seconds
```

A non-zero last exit code with a stderr path is your next stop:

```sh
tail /tmp/sync.err.log
```

```text
2026-10-17 16:10:17 destination /Volumes/Backup is not mounted
```

For a quick overview of everything loaded in your session, `launchctl list` prints the PID,
last exit status and label for each job; `-` means not running.

Load, run, stop:

```sh
# Load a plist into your session
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.sync.plist

# Run it now; add -k to kill a running instance and restart it
launchctl kickstart gui/$(id -u)/com.example.sync

# Unload it, which also stops it
launchctl bootout gui/$(id -u)/com.example.sync
```

`bootstrap` and `bootout` replace the older `load` and `unload`, which `man launchctl` now
lists as legacy subcommands.

Keep a job from loading:

```sh
launchctl disable gui/$(id -u)/com.example.sync
launchctl print-disabled gui/$(id -u)
launchctl enable gui/$(id -u)/com.example.sync
```

`disable` records an override that persists across restarts; it doesn't stop a job that's
already loaded. `enable` removes the block, but doesn't load or start anything by itself.

Daemons work the same way with the `system` domain, but need `sudo`.

## Login items are different

Login item helpers don't have a plist in the folders above. They live inside the app bundle
that registers them, so the way to find one is to look inside the app:
`Contents/Library/LoginItems/`. Once registered, they appear in your `gui/<uid>` domain
under the helper's bundle identifier, and the usual commands apply. To remove one for good,
remove or reconfigure the app that owns it.

## Removing a job you created

Unload it first, then delete the plist:

```sh
launchctl bootout gui/$(id -u)/com.example.sync
rm ~/Library/LaunchAgents/com.example.sync.plist
```

For jobs that other apps installed, use the app's own settings or uninstaller where possible.
Deleting their plists can leave the app in a state its developer didn't plan for.

## Seeing it all in one place

I maintain [Launchpane](https://github.com/webmaxru/Launchpane), a free, MIT-licensed
Mac app that puts this in one window. It builds on azu's open-source
[launchd-ui](https://github.com/azu/launchd-ui). It lists the agents, daemons and login items
above with their state, PID, last exit status, schedules, logs and plists. For your own
agents it can load, run, stop, restart, enable, disable, create and edit. After loading,
unloading, enabling or disabling a job, it reads the state back from launchd instead of
trusting the exit status. Its Commands
tab shows the launchctl equivalents from this article for whichever job you've selected.

Shared plists in `/Library` stay read-only in the app, and system daemons need an explicit
administrator window, the same boundaries macOS draws.

There are two ways to get it. The full app is a download on
[GitHub Releases](https://github.com/webmaxru/Launchpane/releases/latest): Developer ID
signed, notarized by Apple, and built by a public GitHub Actions workflow. The
[Mac App Store edition](https://apps.apple.com/no/app/launchpane/id6820735995?mt=12) passed
App Review and runs in the App Sandbox. The sandbox can't run launchctl, so that edition
inspects jobs and edits your own plists but doesn't load, stop, enable or disable them.

Whether you use it or stick with launchctl, the questions stay the same: where does the job
live, is it loaded, what did it do last time, and where did its output go?
