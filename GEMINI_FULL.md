# NR Nexus — Full Context Archive

## Architectural Decisions
(Moved from GEMINI.md and .context/DECISIONS.md)
[Archive of all historical decisions and architectural notes]

## Design System Details
- Colors: Tailwind classes from `tailwind.config.js` only.
- Components: Import from `src/components/ui/` only.
- Text: All labels must be in `src/i18n/translations.js`.

## Working Style Details
- Read relevant files before assuming.
- No hardcoding Thai/English text in JSX.
- No hex codes in JSX/CSS; use design tokens.

## Agent Context Archive
(Historical details of each agent module)
- Orchestrator
- Discipline
- Attendance
- User Management
- Data Pipeline
- Student Care
- Leave
