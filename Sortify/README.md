# Sortify (macOS) — Native SwiftUI skeleton

This folder contains a SwiftUI macOS app skeleton for Sortify (target macOS 13+). It's a privacy-first, local-first design that:

- Uses PKCE + ASWebAuthenticationSession and a short-lived local HTTP callback (http://127.0.0.1:8888/callback) to perform Spotify OAuth.
- Stores tokens securely in the Keychain.
- Fetches saved (Liked) songs with pagination, batches artist requests to fetch genres, and groups tracks by genre.
- Provides a Dashboard to map each genre to a target playlist and an "Add All to Playlist" action.
- Provides a small local cache in Application Support to reduce API calls.

How to open and run
1. Open Xcode and create a new macOS App (App) project targeting macOS 13+. Replace or add the Swift files from this folder into the project.
2. In the project's Signing & Capabilities, enable the Sandbox and add outgoing network entitlement. Configure App Sandbox as needed for App Store.
3. Add the `NSLocalNetworkUsageDescription` and any other privacy strings you need to `Info.plist`.
4. Replace the placeholder `SPOTIFY_CLIENT_ID` in `SettingsView` (or use your preferred secrets mechanism). For a native mac app use Authorization Code with PKCE — no client secret is required.
5. Build & Run in Xcode.

Rate limits, toasts and reauth
- The client honors 429 Retry-After headers and performs exponential backoff on 5xx responses. When a 429 is encountered the UI receives a toast notification with the wait seconds. The app shows simple toasts via `ToastView` and `ToastManager`.
- If a refresh-token exchange fails the app automatically signs the user out (Keychain cleared) and posts a `sortify.auth.signedOut` notification. The UI should prompt the user to sign in again.

Entitlements template
- A minimal entitlements template is included at `macos/ENTITLEMENTS-Template.plist` showing common sandbox keys used for Mac App Store submission. Review and adapt before submitting.


Notes & packaging
- This skeleton is intended to be a starting point. To publish to the Mac App Store you must add proper entitlements and follow App Store rules (no embedded client secret, use PKCE, sandbox limits, notarization, etc.).
- The local HTTP callback approach requires the app to open a short-lived listener on 127.0.0.1:8888. Ensure the port is available.

Next steps (suggested)
- Add more robust UI flows and unit tests.
- Add background scheduler and Pro features behind a purchase flag.
- Replace the small local HTTP server with more robust abstractions if needed.

Files included:
- `SpotifyAuth.swift` — OAuth + PKCE + local callback listener.
- `SpotifyClient.swift` — Spotify Web API client, pagination, refresh token handling.
- `KeychainStore.swift` — small Keychain wrapper for tokens.
- `CacheStore.swift` — Application Support JSON caching.
- `RateLimiter.swift` — simple exponential backoff helper.
- `Models.swift` — data models (Track, Artist, Playlist, Token, GenreGroup).
- `Views/` — SwiftUI views (ContentView, DashboardView, GenreRow, SettingsView).

License: MIT-style skeleton for your project.
