# CLAUDE.md — sortify
Owner: Sammy Wolfson (solo). Created 2026-07-31 for nightly Cody agent runs.

## What this is
TODO: one line. (Cody: infer from the codebase on first run and fill this in.)

## Rules
- Work on a branch (cody/nightly-YYYY-MM-DD), never commit to main.
- No deploys, no payments, no external services without Sammy approval.
- End every run by updating the Backlog + Run Log below.

## Backlog (Cody: advance top item each run)
1. First run: audit the codebase, fill in What this is, write a real backlog here.

## Run Log
(append-only: date — what changed)

## FIRST-RUN PROTOCOL (before any backlog work)
1. READ the existing project: git log (full history), README, docs, and skim the code structure. Work off what exists — do not reinvent or restructure without reason.
2. RESCUE uncommitted changes: if git status shows uncommitted work, commit it AS-IS to branch cody/rescue-uncommitted-YYYY-MM-DD before touching anything. Never discard it.
3. GITHUB SYNC: gh is not authed yet (Sammy will run gh auth login). Until then: local is the working copy, do NOT force-push anything ever. After auth exists: git fetch first, reconcile with origin before building, push your cody/* branches.
