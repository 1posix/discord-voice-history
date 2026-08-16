# VoiceHistory

> **Credit:** The original idea for this plugin was suggested by [@s4dic](https://github.com/s4dic). VoiceHistory was designed and implemented by [@1posix](https://github.com/1posix).

Bring back a useful Discord voice feature: see who recently left the voice channel you are currently in.

VoiceHistory is a BetterDiscord plugin that keeps a local, temporary history of voice participants. When someone leaves your current voice channel, they remain visible below active users in a dimmed state with the time since they left.

## Features

- **Recent departure:** Shows the most recent user who left the current voice channel.
- **Compact history:** Only one departed user is displayed, keeping the voice channel list clean.
- **Previous departures:** A clock button opens the list of users who left before the latest one.
- **Automatic promotion:** If the latest departed user rejoins, the previous departure automatically becomes visible.
- **Clickable profiles:** Click the visible departed user or any entry in the history popover to open their Discord profile.
- **Stable sidebar placement:** The history is only rendered when the tracked server's voice-channel list is actually visible, preventing it from drifting into Discord's voice connection or profile panels when switching servers or DMs.
- **Relative time:** Displays how long ago the user left, refreshed every 10 seconds.
- **Persistent history:** Keeps recent departures across Discord restarts, with a configurable retention period (24 hours by default).
- **Local only:** History is stored locally through BetterDiscord. No external server or telemetry is used.
- **Compatibility layer:** Uses multiple discovery strategies and automatic rescans to reduce breakage when Discord changes internal stores or methods.
- **Customizable:** Retention time, bots, opacity, sorting, persistence, debug logs and compatibility recovery can be configured from the plugin settings.

## Installation

You need [BetterDiscord](https://betterdiscord.app/) installed on your Discord client.

Download `VoiceHistory.plugin.js` from the **Releases** page, move it into your BetterDiscord plugins folder, then open `User Settings` > `BetterDiscord` > `Plugins` and enable **VoiceHistory**.

The default plugin folders are `%APPDATA%\BetterDiscord\plugins` on Windows, `~/.config/BetterDiscord/plugins` on Linux, and `~/Library/Application Support/BetterDiscord/plugins` on macOS.

## How It Works

VoiceHistory only tracks the voice channel you are currently connected to.

When a user leaves, the latest departure stays visible in a dimmed state below active users. If older departures exist, a clock button appears next to the latest departure and opens the previous history.

```text
Voice Channel
├── Active User
├── You
└── Recently left user   🕘 2   ·   3 min ago
```

If the visible user rejoins, they are removed from the departure history and the previous user is automatically promoted.

## Settings

Open `User Settings` > `BetterDiscord` > `Plugins` and click the settings button next to **VoiceHistory**. You can configure history retention, bots, persistence, relative time, opacity, sorting, compatibility auto-repair, debug logging and local-history cleanup.

## Compatibility

Discord frequently changes its internal client modules. VoiceHistory includes fallback discovery strategies, periodic compatibility rescans and safeguards against unreliable voice-state snapshots.

These mechanisms reduce the chance of a Discord update breaking the plugin, but they cannot guarantee permanent compatibility with future Discord releases.

## Privacy

VoiceHistory runs entirely on your Discord client. Voice history and plugin settings are stored locally and are not sent to an external service.

---

License: MIT
