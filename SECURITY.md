# Security Policy

## Reporting Security Issues

Please do not open a public issue for credential leaks or exploitable security bugs.
Report them privately to the repository owner.

## Credential Handling

SkyTween does not intentionally store Bluesky app passwords in the repository or in plain text project files.

Current versions persist AT Protocol session data in localStorage so the app can resume login. Treat that local session data as sensitive because it can include access and refresh tokens.

Do not commit:

- app passwords
- access tokens
- refresh tokens
- `.env` files
- private keys or certificates

## Maintainer Checklist Before Release

- Run a source-only secret scan.
- Confirm `release/`, `dist/`, `node_modules/`, and `src-tauri/target/` are not tracked.
- Attach binaries to GitHub Releases instead of committing them.
- Prefer app passwords over account passwords when testing Bluesky login.
