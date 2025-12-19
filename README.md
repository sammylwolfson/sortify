# Sortify (macOS) – Free Tier

Native SwiftUI app that signs into Spotify, pulls your Liked Songs, groups them by artist genres, and lets you push each genre group into any of your playlists. No server, no web UI, everything runs locally.

## What’s included
- Spotify OAuth with PKCE (no client secret in app)
- Secure token storage in Keychain
- Fetches all Liked Songs with pagination
- Batches artist lookups to collect genres
- Groups songs by genre (with an “Unknown” bucket)
- Playlist picker per genre + “Add All to Playlist” (chunked to avoid Spotify limits)
- Simple toast + rate-limit/backoff handling
- Lightweight cache in Application Support to reduce API calls

## Setup
1) Open `Sortify/Sortify.xcodeproj` in Xcode (macOS 13+ target).
2) Add your Spotify client ID:
   - In Xcode, set `SortifySpotifyClientID` in the app target’s Info.plist (recommended), **or**
   - Edit `SpotifyAuth.swift` and set `clientId`.
   Use a Spotify app configured with redirect `http://127.0.0.1:8888/callback`.
3) Ensure the app has outgoing network entitlement if you’re sandboxing.
4) Build & run. Click “Sign in with Spotify,” approve scopes, then “Run Now” to fetch + group, pick playlists, and “Add All to Playlist.”

## Notes
- Requires scopes: `user-library-read playlist-modify-private playlist-modify-public playlist-read-private`.
- Rate limits: 429s honor `Retry-After`; 5xx uses exponential backoff; refresh-token failures sign the user out.
- Tokens: stored in Keychain (`sortify.spotify.token`).
- Caching: Liked songs + artists cached to disk; playlist mapping persisted so your selections stick.

## Project structure (Swift only)
- `SortifyAppApp.swift` – entry point wiring auth/client.
- `SpotifyAuth.swift` – PKCE auth, token refresh, local HTTP callback.
- `SpotifyClient.swift` – Spotify Web API calls, grouping logic, playlist mapping, add-to-playlist.
- `NetworkClient.swift`, `RateLimiter.swift` – HTTP helpers/backoff.
- `CacheStore.swift`, `KeychainStore.swift` – persistence.
- `Views/ContentView.swift`, `DashboardView.swift`, `GenreRow.swift`, `Toast*`, `SignInModal.swift`, `SettingsView.swift`.

## Current limitations / next steps
- No paid tier UI; free-only feature set.
- No offline/background scheduling; run manually from the UI.
- No Windows/Linux builds; macOS SwiftUI only.

MIT-style. Enjoy organizing your music. 🎶
