# Features not in main

On 2026-10-28, `main` was set back to the plan-window version, **9cfc077**
("Remove the plan window and merge the new-session buttons"), through
commit `092b76e`. The work below came after that version, so it is **not**
in main's files. None of it was deleted: it lives in git history and on the
branches listed.

## Removed from main (still on GitHub)

These were on `origin/main` before the restore. Reverting `092b76e` brings
all of them back at once.

| Feature | Commit | What it did |
|---|---|---|
| Spaced review | `2b352ab` | Estimates how well each practiced graph node is remembered (FSRS), adds `GET /api/review`, memory notes for the practice agent, and a "Review N due" button. |
| Onboarding and learner profile | `8138839` | First-run walkthrough; picks level, math amount and explanation style, plus typed or spoken notes. Added to every tutor prompt; editable in Settings > About you. |
| AnkiConnect sync | `d9d6fc0` | Syncs with Anki through AnkiConnect (engine module, `/api/anki` route, Settings > Anki section). The same commit started moving UI components to Astryx. |
| Astryx web UI | `2da3a69` | Finished the web UI migration to Astryx; the Astryx themes (neutral, stone, gothic, matcha, y2k, butter, chocolate) replaced the old color themes; session folders in the sidebar (`/api/folders`); a new-session page; an early mobile prototype (OptiMind). |
| Hosted access token gate | `43b798c` | With `AXIOM_ACCESS_TOKEN` set, every `/api` call needs the token; the server refuses a public address without it; optional CORS, `/health`, and a Modal deployment in `deploy/modal`. |
| Petrov Android app | `e64df67`, `2084bfc` (PR #1) | Replaced the mobile prototype with Petrov (Expo) on the shared backend: connect screen, sessions drawer, lessons, practice, question dock, settings, live events. |
| Legacy math test fix | `4e9b1be` (PR #2) | Updated six legacy tests for the coded-math display rule, which fixed CI on main. |

## Never in main (on GitHub branches only)

These were pushed to GitHub as backup branches on 2026-10-28 but were
never merged into main.

| Feature | Commit | Branch |
|---|---|---|
| Shorter README and new web screenshots | `543cc38` | `feat/monorepo-hono`, `feat/standalone-backend` |
| Hosted multi-user mode: Supabase login, per-user data, profiles, plans and billing in Settings > Account, Modal deploy | `8ac8ea7` | `feat/monorepo-hono`, `feat/standalone-backend` |
| Standalone backend in `backend/` (`@kapany/engine`, `@kapany/server`), API-only by default, `docs/api.md` | `19591ca` | `feat/standalone-backend` |

## Work in progress (saved 2026-10-29)

Unfinished work from other sessions, saved as `66e9a48` ("WIP: courses,
materials, textbook and chat mode") on `feat/standalone-backend` and pushed
to GitHub before this folder switched to main:

- Courses: course tools, prompt and `/api/folders/:id/course`
- Materials: material extractor, stores, routes and material cards
- Textbook: textbook tools, prompts and cards
- Chat mode: per-chat mode route (`/api/chats/:id/mode`)
- Sidebar, model picker, stats bar, appearance settings and a Kapany theme

To keep working on it: `git switch feat/standalone-backend`, then
`npm install`.

## Bringing something back

- Everything that was on main: `git revert 092b76e`
- One feature: `git cherry-pick <commit>`, in the order listed
