# Memory

## Project Verification Notes

- In-app browser automation can be unstable in this environment.
- For UI, mobile-width, and console-error verification, prefer the already proven headless Chrome/CDP approach when available.
- Only require browser verification for changes where visual layout, interaction, or runtime console behavior matters.
- Avoid spending too much time retrying flaky browser connections when static checks or headless Chrome/CDP can answer the question.

## Documentation Discipline

- For every meaningful game update, update both `DEVELOPMENT_LOG.md` and `CURRENT_SYSTEM_OVERVIEW.md`.
- `DEVELOPMENT_LOG.md` is the chronological change log.
- `CURRENT_SYSTEM_OVERVIEW.md` is the current source-of-truth system overview. Keep it aligned with `index.html`.
- If behavior, save shape, UI, AI, rendering, unlocks, public deployment assumptions, or known TODOs change, update the overview in the same work session.
