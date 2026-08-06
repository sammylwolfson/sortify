# CLAUDE.md — sortify
Owner: Sammy Wolfson (solo). Audited 2026-07-31 (first-run).

## What this is
Native macOS SwiftUI app (macOS 13+). Signs into Spotify via OAuth PKCE (no client secret), pulls all Liked Songs with pagination, batches artist lookups to collect genres, groups songs by genre, and pushes each group into a chosen playlist. Fully local — no server, tokens in Keychain, lightweight cache in Application Support, rate-limit/backoff handling. Clean, self-contained utility. History includes a security commit removing a committed .env with Spotify creds.

## Rules
- Branch cody/nightly-YYYY-MM-DD only, never commit to main. No deploys/payments/external services without Sammy approval.
- Update Backlog + Run Log every run; summary to Agent Memory as dated file.

## Proposed backlog (for Sammy's review)
1. Rotate the Spotify client credentials exposed in the pre-cleanup .env (removed in 0c90692) if they were ever real.
2. Add a "dry run / preview" of genre buckets before writing to playlists, plus undo (remove-added-tracks).
3. Handle the "Unknown genre" bucket better — optional manual tagging or fallback by related-artist genres.
4. Package a signed/notarized build so it runs without Gatekeeper warnings.

## Run Log
- 2026-07-31 (first-run audit): read README + source list, filled "What this is", proposed backlog. No code changes. Working tree clean.
