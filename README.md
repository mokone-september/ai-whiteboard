# AI Whiteboard

A full-stack whiteboard project exploring visual collaboration, real-time communication, and AI-assisted planning. Built incrementally with React, TypeScript, and Node.js.

> **Status:** Early development. The interactive whiteboard, drawing tools, browser-based persistence, PNG export, Node.js backend health endpoint, and development tooling are in place. Database persistence, real-time collaboration, and AI features remain planned.

## Goals

- Build an interactive workspace for brainstorming and visual planning.
- Develop a typed backend API.
- Persist whiteboards and their contents.
- Explore real-time collaboration.
- Use AI to summarise ideas and generate actionable tasks.
- Practise testing, CI/CD, deployment, and production monitoring.

## Current Features

- [x] React, TypeScript, and Vite frontend.
- [x] Node.js HTTP backend with a `GET /health` endpoint.
- [x] pnpm workspace for frontend and backend.
- [x] ESLint, Prettier, and Husky with lint-staged.
- [x] Frontend and backend build scripts.
- [x] Interactive HTML Canvas whiteboard.
- [x] Freehand drawing with selectable colours and adjustable stroke thickness.
- [x] Rectangle drawing tool.
- [x] Eraser tool.
- [x] Undo the most recent drawing operation.
- [x] Clear the canvas.
- [x] Automatically save and restore drawing history using browser local storage.
- [x] Export the current canvas as a PNG image.
- [ ] Sticky notes and draggable objects.
- [ ] PostgreSQL-backed board persistence.
- [ ] Real-time collaboration.
- [ ] AI-assisted planning.

## Technology Stack

| Area                    | Technology                         | Status            |
| ----------------------- | ---------------------------------- | ----------------- |
| Frontend                | React 19, TypeScript, Vite         | In place          |
| Drawing                 | HTML Canvas API                    | In place          |
| Backend                 | Node.js, TypeScript, native HTTP   | In place          |
| Package management      | pnpm workspaces                    | In place          |
| Code quality            | ESLint, Prettier                   | In place          |
| Git hooks               | Husky, lint-staged                 | In place          |
| Local persistence       | Browser local storage              | In place          |
| Image export            | Canvas API, PNG                    | In place          |
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
├── .github/                 # Workflows and templates
├── .husky/                  # Git hooks
├── backend/
│   └── src/
│       └── index.ts         # HTTP server and health endpoint
├── frontend/
│   └── src/
│       ├── App.tsx          # Whiteboard interface and interactions
│       ├── App.css          # Whiteboard styles
│       └── index.css        # Global styles
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

Check your installed versions:

```bash
node --version
pnpm --version
git --version
```

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

Open the local URL printed by Vite in your browser. It is typically `http://localhost:5173/`.

### Start the backend

In a second terminal, run:

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

## Using the Whiteboard

1. Start the frontend development server.
2. Select the **Pen**, **Shape**, or **Eraser** tool.
3. Choose a colour and adjust the stroke thickness.
4. Draw on the canvas using a mouse or compatible pointer device.
5. Use **Undo** to remove the most recent drawing operation.
6. Use **Clear** to remove all drawings.
7. Select **Export PNG** to download the current canvas as an image.
8. Refresh the page to restore drawings saved in browser local storage.

## Data and Persistence

The current implementation stores drawing history in browser local storage.

- Drawings persist across page refreshes in the same browser profile.
- Undo and Clear changes are also saved.
- Drawings are not synchronised across browsers or devices.
- Clearing the browser's site data can delete locally stored drawings.
- PostgreSQL-backed storage, user accounts, and multi-board management are not yet implemented.

## Available Commands

Run these commands from the repository root.

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

Run the quality checks before submitting changes:

```bash
pnpm run format:check
pnpm run lint
pnpm run build
```

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

- [x] Replace the default starter screen with the whiteboard interface.
- [x] Add freehand drawing and rectangle shapes.
- [x] Add colour selection and adjustable stroke thickness.
- [x] Add an eraser, Undo, and Clear.
- [x] Save and restore drawings using browser local storage.
- [x] Export drawings as PNG.
- [ ] Create and edit sticky notes.
- [ ] Move, recolour, and delete objects.
- [ ] Improve keyboard accessibility and responsive layouts.
- [ ] Add automated tests for drawing history and editing operations.

### Phase 2 — Backend API

- [ ] Design REST endpoints for boards and objects.
- [ ] Validate incoming requests.
- [ ] Standardise error responses.
- [ ] Connect the frontend to the backend.
- [ ] Add API tests.

### Phase 3 — Persistence

- [ ] Add PostgreSQL.
- [ ] Design the board and object schema.
- [ ] Save and load whiteboards through the backend.
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
- [ ] Document deployment and production configuration.
- [ ] Add monitoring and error reporting.

## Contributing

Contributions, bug reports, and suggestions are welcome.

Before submitting changes:

1. Review `CONTRIBUTING.md`.
2. Keep changes focused and easy to review.
3. Run formatting, lint, and build checks.
4. Describe the change and relevant testing in your pull request.

## License

No license has been specified yet. Until a license is added to the repository, permission to reuse, modify, or redistribute this project should not be assumed.
