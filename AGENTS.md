# Agent Instructions

- Use the existing stack in this repository: Next.js App Router, TypeScript, Chakra UI, Lucide, and Supabase.
- For any database-related work, prefer the Supabase CLI via `npx supabase` to reduce manual setup and command execution for the user.
- Assume the Supabase CLI is not installed globally on this machine. Do not use `supabase ...`; use `npx supabase ...` instead.
- The app must keep running even when Supabase environment variables are missing. Do not introduce code that crashes on startup when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent.
- At the end of every implementation task, explicitly tell the user whether they need to run any follow-up commands.
- If a restart is needed, say so plainly and provide the exact command, for example: `npm run dev`.
- If database updates are needed, say so plainly and provide the exact command or commands to run.
- If any other manual step is required, provide the exact command sequence in the final message.
- If no manual action is required, state that clearly.
