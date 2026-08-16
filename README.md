# VoiceHistory

> **Credit:** The original idea for this plugin was suggested by [@s4dic](https://github.com/s4dic). VoiceHistory was designed and implemented by [@1posix](https://github.com/1posix).

Bring back a useful Discord voice feature: see who recently left the voice channel you are currently in.

VoiceHistory is a BetterDiscord plugin that keeps a local, temporary history of voice participants. When someone leaves your current voice channel, the latest departure remains visible below active users in a dimmed state.

## Features

- **Recent departure:** Shows the most recent user who left the current voice channel.
- **Compact history:** Only one departed user is displayed to keep the channel list clean.
- **Previous departures:** A clock button opens the list of earlier departures.
- **Automatic promotion:** If the latest departed user rejoins, the previous departure becomes visible automatically.
- **Clickable profiles:** Click a departed user to open their Discord profile.
- **Stable sidebar placement:** VoiceHistory only renders beside the tracked voice channel when the correct server is visible.
- **Relative time:** Departure time is refreshed every 10 seconds.
- **Persistent history:** Recent departures survive Discord restarts, with a configurable retention period of 24 hours by default.
- **Compatibility layer:** Multiple fallback strategies and automatic rescans help VoiceHistory survive Discord internal changes.
- **Automatic updates:** The lightweight loader checks GitHub for a newer `VoiceHistory.plugin.js` and reloads it automatically.
- **Offline fallback:** After the first successful download, the loader can start the last working cached copy if GitHub is temporarily unavailable.
- **Local history:** Voice history and plugin settings remain stored locally through BetterDiscord.

## Installation

You need [BetterDiscord](https://betterdiscord.app/) installed on your Discord client.

### New installation

1. Download **`VoiceHistoryLoader.plugin.js`** from the latest GitHub Release.
2. Move `VoiceHistoryLoader.plugin.js` into your BetterDiscord plugins folder.
3. Open Discord → `User Settings` → `BetterDiscord` → `Plugins`.
4. Enable **VoiceHistoryLoader**.
5. Done. The loader downloads and starts VoiceHistory automatically.

The user only needs to install **`VoiceHistoryLoader.plugin.js`**. Do not install `VoiceHistory.plugin.js` manually.

### Upgrading from the old standalone plugin

If you previously installed `VoiceHistory.plugin.js` directly:

1. Disable **VoiceHistory** in BetterDiscord.
2. Remove `VoiceHistory.plugin.js` from the BetterDiscord plugins folder.
3. Add `VoiceHistoryLoader.plugin.js` instead.
4. Enable **VoiceHistoryLoader**.

Keeping both files installed locally could start VoiceHistory twice.

### Default BetterDiscord plugin folders

- **Windows:** `%APPDATA%\BetterDiscord\plugins`
- **Linux:** `~/.config/BetterDiscord/plugins`
- **macOS:** `~/Library/Application Support/BetterDiscord/plugins`

## Automatic Updates

`VoiceHistoryLoader.plugin.js` is intentionally small and changes rarely.

The loader fetches the current runtime directly from:

```text
https://raw.githubusercontent.com/1posix/discord-voice-history/main/VoiceHistory.plugin.js
```

It checks shortly after startup and then periodically while Discord stays open. If the remote plugin changes, the loader replaces the running runtime automatically.

The last working runtime is cached locally, so temporary GitHub/network outages do not prevent VoiceHistory from starting after the first successful download.

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

Open `User Settings` → `BetterDiscord` → `Plugins` and open the VoiceHistory settings panel.

You can configure retention time, bots, persistence, relative time, opacity, sorting, compatibility recovery, debug logging and local-history cleanup.

## Compatibility

Discord frequently changes its internal client modules. VoiceHistory includes fallback discovery strategies, periodic compatibility rescans and safeguards against unreliable voice-state snapshots.

These mechanisms reduce the chance of a Discord update breaking the plugin, but cannot guarantee permanent compatibility with future Discord releases.

## Privacy

VoiceHistory does not send your voice history or plugin settings to an external service.

The loader only contacts this GitHub repository to retrieve the current `VoiceHistory.plugin.js` used to run and update the plugin.

---

License: MIT
