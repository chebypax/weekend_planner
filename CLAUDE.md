# Claude Instructions

- Follow the rules in `AGENTS.md`.
- For database-related tasks, use Supabase CLI commands through `npx supabase`.
- Assume there is no global Supabase CLI on this machine, so every Supabase CLI command must start with `npx supabase`.
- After finishing changes, always tell the user whether they need to restart the app server, push database updates, refresh generated files, or run any other commands.
- Whenever action is required, provide exact commands with no placeholders other than values the user must supply.
