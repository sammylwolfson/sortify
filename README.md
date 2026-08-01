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
   Use a Spotify app configured with redirect `sortify://callback`.
3) Ensure the app has outgoing network entitlement if you’re sandboxing.
4) Build & run. Click “Sign in with Spotify,” approve scopes, then “Run Now” to fetch + group, pick playlists, and “Add All to Playlist.”

## Notes
- Requires scopes: `user-library-read playlist-modify-private playlist-modify-public playlist-read-private`.
- Rate limits: 429s honor `Retry-After`; 5xx uses exponential backoff; refresh-token failures sign the user out.
- Tokens: stored in Keychain (`sortify.spotify.token`).
- Caching: Liked songs + artists cached to disk; playlist mapping persisted so your selections stick.

## Project structure (Swift only)
- `App/SortifyAppApp.swift` – entry point wiring auth/client.
- `Auth/SpotifyAuth.swift` – PKCE auth, token refresh, custom URL scheme callback.
- `Clients/SpotifyClient.swift` – Spotify Web API calls, grouping logic, playlist mapping, add-to-playlist.
- `Clients/NetworkClient.swift`, `Clients/RateLimiter.swift` – HTTP helpers/backoff.
- `Storage/CacheStore.swift`, `Storage/KeychainStore.swift` – persistence.
- `UI/Views/ContentView.swift`, `UI/Views/DashboardView.swift`, `UI/Views/GenreRow.swift`, `UI/Views/ToastView.swift`, `UI/Views/SignInModal.swift`, `UI/Views/SettingsView.swift`.
- `UI/Toast/ToastManager.swift` – toast state.

## Future features (planned)
- Ship a native app: SwiftUI macOS build (or Catalyst for iPad) with Apple‑sanctioned login flow and polished UI; easier to charge on Mac App Store with trials, family sharing, and automatic updates.
- Add “pro-only” utility: scheduled auto-sorting, smart genre rules (combine/alias genres), duplicate sweeps, “mood/energy” mixes, and export/import rules. These justify recurring value vs. one-time.
- Personalization & safety: local-first processing, no data collection, clear scopes; optional offline cache so big libraries don’t re-fetch. This improves trust to pay.
- Pricing model: free tier = manual sort + limits; Pro (3–7/mo or 19–29/yr) = unlimited rules, scheduling, energy/mood mixes, multi-account, priority support. Offer one-time lifetime for early adopters.
- Distribution & onboarding: notarized dmg + Mac App Store listing; add a short guided tour and default genre rules; “one-click organize now” button for immediate win.
- Partnerships/affiliates: bundle with productivity newsletters/creators and offer referral discounts.

## Current limitations / next steps
- No paid tier UI; free-only feature set.
- No offline/background scheduling; run manually from the UI.
- No Windows/Linux builds; macOS SwiftUI only.

MIT-style. Enjoy organizing your music.
