# AI Whiteboard — Agent Instructions

## Project overview

AI Whiteboard is a learning and portfolio project for building a collaborative
whiteboard with AI-assisted features.

The repository uses pnpm workspaces with a React/TypeScript frontend and a
Node.js/TypeScript backend. The project is under active development.

## Before making changes

- Read this file and the relevant package.json files.
- Inspect existing code before proposing architectural changes.
- Follow the existing patterns and keep changes focused.
- Do not assume planned features have already been implemented.
- Ask before introducing major architectural changes or unnecessary dependencies.

## Commands

Run commands from the repository root unless specified otherwise.

- Install dependencies: `pnpm install --frozen-lockfile`
- Check formatting: `pnpm run format:check`
- Format files: `pnpm run format`
- Lint workspaces: `pnpm run lint`
- Build workspaces: `pnpm run build`
- Start frontend: `pnpm run dev:frontend`
- Start backend: `pnpm run dev:backend`

Run relevant checks after changing code. Report any checks that could not run.

## Coding conventions

- Use TypeScript and preserve strict type safety.
- Avoid `any` unless there is a justified reason.
- Keep frontend and backend responsibilities separate.
- Prefer small, readable, maintainable functions and components.
- Handle errors explicitly.
- Follow the existing ESLint and Prettier configuration.
- Add dependencies only when they provide clear value.
- Do not claim tests exist or pass unless verified.

## Security and reliability

- Never commit secrets, API keys, passwords, or populated environment files.
- Validate and safely handle untrusted input on the backend.
- Do not expose private environment variables to the frontend.
- Avoid destructive shell commands and unrelated file changes.
- Do not silently discard existing user changes.

## Git workflow

- Inspect `git status` before editing or committing.
- Keep changes focused on the requested task.
- Do not commit or push unless the user asks.
- Summarize changed files and checks performed.
