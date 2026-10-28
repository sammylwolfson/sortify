# CLAUDE.md — sortify
Owner: Sammy Wolfson (solo). Audited 2026-07-31 (first-run).

## What this is
Native macOS SwiftUI app (macOS 13+). Signs into Spotify via OAuth PKCE (no client secret), pulls all Liked Songs with pagination, batches artist lookups to collect genres, groups songs by genre, and pushes each group into a chosen playlist. Fully local — no server, tokens in Keychain, lightweight cache in Application Support, rate-limit/backoff handling. Clean, self-contained utility. Reachable history keeps the commit that removed a committed `.env`; on 2026-10-28 the client secret inside older `.env` blobs was replaced with `REDACTED_SPOTIFY_CLIENT_SECRET`.

## Rules
- Branch cody/nightly-YYYY-MM-DD only, never commit to main. No deploys/payments/external services without Sammy approval.
- Update Backlog + Run Log every run; summary to Agent Memory as dated file.

## Proposed backlog (for Sammy's review)
1. Rotate the Spotify client secret in the Spotify developer dashboard. On 2026-10-28 (approval `t6550s23386`) reachable history on `main`, `claude/review-sortify-app-VksMk`, and `cody/rescue-uncommitted-2026-07-31` was rewritten so the committed 32-hex secret (`7e65...950`) is `REDACTED_SPOTIFY_CLIENT_SECRET` in historical `.env` files. The fingerprint `9a06...e39` from that approval does not occur in this repo. GitHub still serves the pre-rewrite commits by SHA until garbage collection, and any older clone still has the value, so rotation is still required. The public client ID in `Sortify/Sortify-Info.plist` was left in place. The removal commit is now `43330c4` (was `0c90692`).
2. Add a "dry run / preview" of genre buckets before writing to playlists, plus undo (remove-added-tracks).
3. Handle the "Unknown genre" bucket better — optional manual tagging or fallback by related-artist genres.
4. Package a signed/notarized build so it runs without Gatekeeper warnings.

## Run Log
- 2026-10-28 (secret scrub, approval `t6550s23386`): `git filter-repo --replace-text` across every branch. Replaced the committed Spotify client secret (`7e65...950`) with `REDACTED_SPOTIFY_CLIENT_SECRET`. `9a06...e39` was already absent. Verified 0 of 55 commits and 0 of 363 blobs contain the secret. Force-pushed `main` (`13a98bd` → `88eda99`), `claude/review-sortify-app-VksMk` (`b80ae31` → `45aa040`), and `cody/rescue-uncommitted-2026-07-31` (`ce6fd71` → `cf60c39`).
- 2026-07-31 (first-run audit): read README + source list, filled "What this is", proposed backlog. No code changes. Working tree clean.
