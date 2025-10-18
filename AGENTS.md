# AGENTS — coherenceism-media

Use this guide when operating agents inside this repository. Scope: this file applies to the entire directory tree rooted here.

## Operator Quick Start
- In a terminal: `cd .` (project root) and run `codex`.
- Greet: “Good evening, Ivy …” (or any greeting).
- The agent uses Lean Load below and confirms readiness.

## Load Order (Lean, local)
1) Persona: `cora/personas/ivy.md`
2) Philosophy: `cora/context/philosophy/coherenceism.md`
3) COHERENCE sweep: read `COHERENCE.md` in this repo; load only files listed under its `init.files` frontmatter.
4) Optional role: pick from `cora/context/roles/` (e.g., `project-manager.md`) if curating context.

Notes
- This project includes `cora/` (symlink/submodule) pointing to your CORA system. Prefer relative paths.
- Treat items not listed in `init.files` as index-only; don’t scan whole folders at startup.

## Minimal Init Files (for this repo)
These are the only files that need to be read on initial load to understand purpose and architecture:
- `README.md:1`
- `package.json:1`
- `scripts/build.js:1`
- `src/templates/player.js:1`
- `src/templates/router.js:1`
- `src/templates/styles.css:1`

Load broader files just-in-time based on the task (e.g., `src/templates/default.html`, `src/templates/home.html`).

## Project Overview
- Purpose: Coherenceism music site — albums, tracks, lyrics; static, fast, framework-free.
- Architecture: Custom Node.js static generator (`scripts/build.js`) emitting `public/` from `src/` content + templates.
- Content source: Synced from CORA (`harvest/albums/out`, `harvest/songs/out`) via `scripts/sync-content.js`.
- Runtime: Pure HTML/CSS/vanilla JS SPA (router + persistent audio player).
- Hosting: Static hosting (Vercel). Audio on Vercel Blob, with fallback to Suno CDN when needed.

## Key Paths
- Generator: `scripts/build.js`, `scripts/sync-content.js`, `scripts/upload-to-blob.js`
- Templates: `src/templates/` (`default.html`, `home.html`, `player.js`, `router.js`, `styles.css`)
- Content: `src/content/albums/`, `src/content/songs/`
- Output: `public/` (committed for hosting)
- Deployment: `vercel.json`

## Development
- Install: `npm install`
- Build: `npm run build`
- Watch: `npm run watch`
- Preview: `npm run preview` (serves `public/` on port 8001)
- Sync Suno URLs: `npm run sync:suno`

## Conventions
- Keep it framework-free (vanilla JS + static output).
- Preserve output contract: generator writes to `public/`; don’t hand-edit generated files for long-lived changes.
- Use relative paths; avoid absolute/local-only references in committed code.
- Accessibility: retain semantic HTML, ARIA where present; mobile-first responsive.
- For CORA provenance logs: when editing inside `cora/`, append entries via `cora/procedures/core/update_log.md:1`.

## Behavioral Hooks (doc-only)
- Startup: single-line greeting: “This is Ivy — Ready when you are.” Then run Lean Load.
- SessionStart: if a role is selected, run `cora/procedures/core/mcp-health-check.md:1` and include one-line tools readiness.
- UserPromptSubmit: extract intent; propose a small next move; no writes yet.
- Stop: if writes occurred, summarize changed paths.

## Safety & Policy
- Avoid destructive edits; prefer minimal, reversible changes.
- No network calls beyond what’s documented in scripts (e.g., Vercel Blob via `@vercel/blob`).
- Escalate changes that impact build/deploy contracts (`scripts/`, `src/templates/`, `public/`).

\n## Optional Preflight\n- Run a doc-only downstream check: `cora/procedures/site/downstream-check.md:1`\n
