# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mac users, developers, and technical operators who need to understand or control the background services running on their machine. They may know that launch agents, launch daemons, and login items exist without remembering `launchctl` syntax or plist structure. They come to Launchpane to answer practical questions quickly: what is running, why it is running, whether it is enabled, when it last ran, what it logged, and how to change it safely.

## Product Purpose

Launchpane makes macOS background services visible and manageable through a focused native desktop interface. Success means a user can find the relevant service, understand its current state and configuration, inspect evidence such as logs and exit status, and perform the intended action without translating between plist files, terminal commands, and scattered system locations.

## Positioning

Launchpane is a purpose-built control surface for macOS launch agents, launch daemons, and app login items. It combines discovery, status, configuration, logs, and lifecycle controls in one place while preserving the operating system's ownership boundaries. It is not a generic process monitor, task manager, or cross-platform automation tool.

## Operating Context

Launchpane is a resizable macOS desktop app built with Tauri, React, and Rust. Its primary workspace is a dense, searchable inventory of background services, followed by detail, log, command, and editing surfaces. Most users operate on their own user agents in `~/Library/LaunchAgents/`. The standalone build also controls shared `/Library/LaunchAgents` in the user's GUI session; system daemons require an explicit administrator window. Shared plist editing and removal remain protected.

Users should be able to scan the list before opening detail, distinguish source and state at a glance, and see clear feedback for every action. Destructive or consequential operations require explicit confirmation. The interface must behave like a dependable macOS utility: keyboard-accessible, compact, calm, and precise under both light and dark system appearances.

## Capabilities and Constraints

- Discover user launch agents, system launch agents, system launch daemons, and application login items.
- Search by label and filter by source, including a focused view of user-authored home agents.
- Show runtime state, enabled state, process ID, last exit code, and last run information when available.
- Start, stop, restart, test-run, enable, disable, edit, create, and remove user agents where macOS permissions allow.
- Inspect plist configuration, command arguments, schedules, environment variables, working directories, and raw XML.
- Preview interval and calendar schedules and expose stdout and stderr logs when configured.
- Reveal the relevant plist or helper bundle in Finder.
- Login items have no standalone plist; enable and disable plus registered-service run, restart and unload are supported. Unload warns that only the parent app can register the helper again.
- Shared GUI agents support lifecycle controls without root; system daemons require administrator mode. Shared plist editing/removal stays hidden even as root. Privileged behavior must be explicit and must never look equivalent to ordinary user-agent editing.
- State changes must be verified after execution. Errors, partial success, permission limits, stale data, and refresh failures must be shown plainly rather than collapsed into success-shaped feedback.
- Launchpane is macOS-only. The `web` platform value describes the rendered interface layer for Impeccable tooling, not a browser-distributed product.
- The app is currently distributed unsigned for direct download; installation requires removing macOS quarantine. App Store distribution is constrained by sandbox restrictions around `launchctl` and writes to `~/Library/LaunchAgents/`.
- Product claims, security guarantees, performance benchmarks, user counts, and distribution commitments must not be invented without evidence.

## Brand Commitments

Capable, calm, exact. Launchpane should feel like a trustworthy instrument for a part of macOS that is normally opaque: technically credible without becoming terminal cosplay, approachable without hiding system truth, and polished without decorative noise.

Three-word personality: **capable, calm, exact**.

The product and its communication must avoid:

- Alarmist language that makes ordinary background services sound inherently dangerous.
- Vague labels such as "Fix", "Optimize", or "Clean" when the actual system operation can be named.
- Generic dashboard theatrics, decorative metrics, fake activity, or visualizations that do not help a user decide or act.
- Terminal aesthetics used as decoration rather than for real commands, paths, identifiers, or logs.
- Success messages before the resulting macOS state has been verified.
- Treating system-owned services as if they were ordinary editable user files.
- Invented explanations for unfamiliar agents; show verified metadata and evidence instead.

## Evidence on Hand

- `README.md` and `docs/native-actions.md` document service sources, lifecycle actions, state dependencies, logs, schedules, privilege boundaries and protected shared files.
- `src/App.tsx` implements the primary inventory workflow, confirmations, action feedback, privilege state, creation, editing, and detail navigation.
- `src/components/JobList.tsx`, `JobRow.tsx`, `JobDetail.tsx`, `LogViewer.tsx`, and `CommandPanel.tsx` establish the current operational surfaces and terminology.
- `src/types.ts` defines the product's service sources, statuses, actions, schedule model, plist configuration, and runtime data.
- `src-tauri/src/` contains the launchd, plist, login-item, filesystem, privilege, and command implementations that determine actual capability.
- `branding/README.md` records the shipping daemon-pulse identity and its indigo, signal-mint, and amber palette.
- `src/index.css` records the existing light and dark application tokens, native system font stack, compact desktop minimum width, focus treatment, and reduced-motion handling.
- `src-tauri/tauri.conf.json` confirms a resizable macOS desktop window and the `com.webmaxru.launchpane` application identity.

## Product Principles

1. **Show system truth.** Prefer verified state, real paths, real commands, and available evidence over inferred explanations.
2. **Make consequences legible.** Users should understand what an action changes, whether it persists, and when macOS or a parent app may reverse it.
3. **Respect ownership boundaries.** User-authored agents are actionable; system-owned services are contextual and protected by default.
4. **Optimize for diagnosis before intervention.** Search, state, configuration, timestamps, exit codes, and logs should help users understand a service before changing it.
5. **Keep expert power approachable.** Preserve the precision of launchd terminology while removing unnecessary command-line memorization and plist ceremony.
6. **Verify every mutation.** A requested action is not complete until the resulting state has been read back or a verification failure has been surfaced.
7. **Behave like a Mac utility.** Support light and dark appearances, keyboard use, system typography, restrained motion, clear hierarchy, and dense but readable information.

## Accessibility & Inclusion

Baseline: WCAG 2.1 AA for the rendered interface, adapted to a keyboard-first macOS desktop utility.

- Every operation must be reachable by keyboard with a visible focus indicator.
- Status and enabled state must never rely on color alone; pair color with text, iconography, or shape.
- Loading, success, failure, destructive confirmation, and privilege state must be announced with meaningful text.
- Text and essential controls must maintain sufficient contrast in both light and dark appearances.
- Motion must respect `prefers-reduced-motion`; no workflow may depend on animation.
- Dense tables and technical values must remain readable under text scaling and window resizing within the app's supported minimum size.
- Copy should use plain language around unfamiliar launchd concepts while retaining exact labels, file paths, commands, and system terms where precision matters.
