# AI Whiteboard

A full-stack whiteboard project exploring visual collaboration, real-time communication, and AI-assisted planning. Built incrementally with React, TypeScript, and Node.js.

> **Status:** Early development. The frontend starter, Node.js backend health endpoint, and development tooling are in place. The interactive whiteboard, persistence, collaboration, and AI features are planned.

## Goals

- Build an interactive workspace for brainstorming and visual planning.
- Develop a typed backend API.
- Persist whiteboards and their contents.
- Explore real-time collaboration.
- Use AI to summarise ideas and generate actionable tasks.
- Practise testing, CI/CD, deployment, and production monitoring.

## Current Features

- [x] React, TypeScript, and Vite frontend scaffold.
- [x] Node.js HTTP backend.
- [x] `GET /health` health-check endpoint.
- [x] pnpm workspace for frontend and backend.
- [x] ESLint and Prettier.
- [x] Husky pre-commit hook with lint-staged.
- [x] Frontend and backend build scripts.
- [ ] Interactive whiteboard canvas.
- [ ] Sticky notes, drawing, and draggable objects.
- [ ] Persistent storage.
- [ ] Real-time collaboration.
- [ ] AI-assisted planning.

## Technology Stack

| Area                    | Technology                         | Status            |
| ----------------------- | ---------------------------------- | ----------------- |
| Frontend                | React, TypeScript, Vite            | In place          |
| Backend                 | Node.js, TypeScript, native HTTP   | In place          |
| Package management      | pnpm workspaces                    | In place          |
| Code quality            | ESLint, Prettier                   | In place          |
| Git hooks               | Husky, lint-staged                 | In place          |
| Database                | PostgreSQL                         | Planned           |
| Validation              | Zod                                | Planned           |
| Testing                 | Vitest                             | Planned           |
| Real-time communication | Socket.IO                          | Planned           |
| Error monitoring        | Sentry                             | Planned           |
| Product analytics       | PostHog                            | Optional, planned |
| CI/CD                   | GitHub Actions                     | Planned           |
| AI experimentation      | Ollama or a compatible AI provider | Planned           |

Technologies will be introduced when they serve an implemented feature.

## Project Structure

```text
ai-whiteboard/
├── .github/                 # Planned workflows and templates
├── .husky/                  # Git hooks
├── backend/
│   └── src/
│       └── index.ts         # HTTP server and health endpoint
├── frontend/
│   └── src/                 # React application
├── eslint.config.js
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js compatible with the project dependencies.
- pnpm 12.11.2, as specified by the project.
- Git.

### Installation

```bash
git clone https://github.com/mokone-september/ai-whiteboard.git
cd ai-whiteboard
pnpm install
```

### Start the frontend

```bash
pnpm run dev:frontend
```

Open the local URL printed by Vite.

### Start the backend

In a second terminal:

```bash
pnpm run dev:backend
```

The backend listens on `127.0.0.1:3000` by default.

### Verify the health endpoint

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "ai-whiteboard-backend"
}
```

## Available Commands

Run these from the repository root.

| Command                   | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `pnpm run dev:frontend`   | Start the frontend development server    |
| `pnpm run dev:backend`    | Start the backend development server     |
| `pnpm run build:frontend` | Build the frontend                       |
| `pnpm run build:backend`  | Compile the backend TypeScript           |
| `pnpm run build`          | Build available workspace packages       |
| `pnpm run lint`           | Lint workspace packages                  |
| `pnpm run format`         | Format project files                     |
| `pnpm run format:check`   | Check formatting without modifying files |

## API

### `GET /health`

Returns the backend's current health status.

**Success:** `200 OK`

```json
{
  "status": "ok",
  "service": "ai-whiteboard-backend"
}
```

Unknown routes currently return `404 Not Found`.

## Development Roadmap

### Phase 1 — Whiteboard UI

- [ ] Replace the default starter screen with the whiteboard interface.
- [ ] Create and edit sticky notes.
- [ ] Move, recolour, and delete objects.
- [ ] Add basic drawing and shapes.
- [ ] Improve keyboard accessibility and responsive layouts.

### Phase 2 — Backend API

- [ ] Design REST endpoints for boards and objects.
- [ ] Validate incoming requests.
- [ ] Standardise error responses.
- [ ] Connect the frontend to the backend.
- [ ] Add API tests.

### Phase 3 — Persistence

- [ ] Add PostgreSQL.
- [ ] Design the board and object schema.
- [ ] Save and load whiteboards.
- [ ] Handle loading, empty, and error states.

### Phase 4 — Real-Time Collaboration

- [ ] Add Socket.IO.
- [ ] Create rooms for individual boards.
- [ ] Synchronise changes between connected users.
- [ ] Handle reconnecting clients and simultaneous edits.

### Phase 5 — AI Assistance

- [ ] Evaluate local AI models with Ollama where hardware permits.
- [ ] Summarise whiteboard content.
- [ ] Convert notes into actionable tasks.
- [ ] Generate brainstorming prompts and project plans.
- [ ] Handle AI errors and loading states.

### Phase 6 — Testing and CI/CD

- [ ] Introduce automated unit and integration tests.
- [ ] Add a GitHub Actions workflow.
- [ ] Run linting and builds on pull requests.
- [ ]
