# App versions

All versions open the live site (https://nooranquran.github.io/), so a change to the site shows up in every app without rebuilding.

| Platform | How | Source |
| --- | --- | --- |
| Chrome / Edge / Android browser | "Install app" button on the site (web app manifest + `sw.js`) | `install.js`, `manifest.webmanifest` |
| iPhone / iPad | Safari → Share → Add to Home Screen (guide shown on the site) | `install.js` |
| Android `.apk` | Trusted Web Activity built with Bubblewrap | `apps/android/twa-manifest.json`, `.well-known/assetlinks.json` |
| Windows `.exe`, Mac `.dmg` | Tauri window that loads the site | `apps/desktop/src-tauri/` |

`.github/workflows/apps.yml` builds the `.apk`, `.exe` and `.dmg` on every pull request that touches `apps/`. On `main` it also publishes them as a GitHub Release. The site links to `releases/latest/download/Hezbkhani.apk`, `Hezbkhani-Setup.exe` and `Hezbkhani.dmg`, so the links always point to the newest build. To rebuild by hand: Actions → App builds → Run workflow (on `main`).

## Android signing key (one-time setup)

The `.apk` is only published when these two repository secrets exist (Settings → Secrets and variables → Actions):

- `ANDROID_KEYSTORE_BASE64`: the keystore file, base64-encoded
- `ANDROID_KEYSTORE_PASSWORD`: its password (store and key use the same one; alias `hezbkhani`)

Always use the same key. A different key means users can't update, and the app shows an address bar because it no longer matches the fingerprint in `.well-known/assetlinks.json`.

## Unsigned builds

The `.exe` and `.dmg` are not code-signed, so users see a warning the first time they open them. On Windows, click "More info" and then "Run anyway". On Mac, if the app won't open, go to System Settings → Privacy & Security and click "Open Anyway". Removing the warnings needs a paid Apple Developer account ($99/year) and a Windows code-signing certificate.

## Who sees what

Everyone sees the install section, which has the browser's install button and "Add to Home Screen" steps for iPhone, Android and computers. Admins can choose how it shows on the home page in Admin › Settings, and it is always in the ☰ menu. The `.apk`/`.exe`/`.dmg` download links show only at `#admin` for now. Set `FILES_ADMIN_ONLY = false` in `install.js` to show them to everyone.
