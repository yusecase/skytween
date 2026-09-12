# BskyTween

BskyTween is a Windows desktop Bluesky client prototype inspired by OpenTween.
It focuses on dense timeline reading, fast tab switching, and collecting multiple information sources into one compact app.

This is not an official Bluesky client.

## Features

- Home timeline
- Notifications tab for mentions, replies, likes, reposts, follows, quotes, and related account activity
- Public search tabs
- Closable search tabs
- Per-tab notification toggle
- Automatic refresh interval selector
- Persisted tabs, refresh interval, notification toggles, and reply visibility settings
- Settings dialog with custom auto-refresh interval in seconds
- Read/unread timeline state with unread rows shown in bold
- Home reply visibility toggle, disabled by default
- Windows toast notifications for newly detected posts
- OpenTween-style upper timeline table and lower detail pane
- Post detail view with images, quote text, and counters
- Basic text posting
- Like and repost actions for timeline posts
- Saved AT Protocol session resume

## Not Yet Implemented

- Lists
- Custom feeds
- Advanced keyword/search condition tabs
- Replies and quote posts as actions
- System tray
- Encrypted credential storage through Windows Credential Manager or a similar native store

## Privacy And Credentials

BskyTween asks for a Bluesky handle and app password at login.

The app does not hard-code credentials or API keys. The entered app password is used only for the login request.

Current session persistence stores the AT Protocol session data in the Tauri WebView localStorage under:

```text
bskytween.atproto.session.v1
```

That session data can include access and refresh tokens. It is local runtime data and must not be committed to GitHub. It is not stored in this repository by normal app usage.

Before wider distribution, session storage should be moved to a Windows-safe credential mechanism such as Windows Credential Manager or another native secure store.

## What To Commit

Good to commit:

- `src/`
- `src-tauri/src/`
- `src-tauri/capabilities/`
- `src-tauri/icons/`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `package.json`
- `package-lock.json`
- `tsconfig*.json`
- `vite.config.ts`
- `scripts/`
- `README.md`
- `LICENSE`
- `SECURITY.md`
- `.gitignore`
- `.gitattributes`

Do not commit:

- `node_modules/`
- `dist/`
- `src-tauri/target/`
- `src-tauri/gen/`
- `release/`
- `.env` or `.env.*`
- private keys, certificates, app passwords, access tokens, or refresh tokens

Release binaries such as `bskytween.exe` and the installer should be uploaded to GitHub Releases instead of committed to the repository.

## Development Setup

Requirements:

- Windows
- Node.js 24 or later
- npm 11 or later
- Rust toolchain with Cargo
- Visual Studio Build Tools with MSVC

Install dependencies:

```powershell
npm install
```

## Run

Frontend-only development:

```powershell
npm run dev
```

Tauri desktop development:

```powershell
npm run tauri dev
```

On Windows, if Cargo or MSVC are not available in the current shell, use:

```powershell
npm run tauri:dev:windows
```

## Build

Frontend build:

```powershell
npm run build
```

Tauri desktop build:

```powershell
npm run tauri build
```

On Windows, if Cargo or MSVC are not available in the current shell, use:

```powershell
npm run tauri:build:windows
```

The generated installer and executable are build artifacts. Keep them out of Git and attach them to GitHub Releases when publishing.

## License

MIT
