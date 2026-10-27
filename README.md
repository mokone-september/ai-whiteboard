# AI Whiteboard

An interactive whiteboard for brainstorming, drawing, and visual planning. Built with React, TypeScript, Vite, and a Node.js backend, this project explores the foundations of collaborative and AI-assisted workspaces.

**Project status:** Interactive frontend implemented, browser-based persistence working, and backend health endpoint available. Real-time collaboration, database-backed storage, and AI assistance are planned.

## Features

### Interactive whiteboard

- Freehand drawing with configurable colours and stroke thickness.
- Rectangle drawing tool.
- Eraser tool.
- Select and move existing drawing strokes.
- Delete a selected stroke using the keyboard.
- Undo the most recent drawing operation.
- Clear all drawing strokes.
- Export the whiteboard as a PNG image.

### Sticky notes

- Create sticky notes on the board.
- Edit note text.
- Move notes around the workspace.
- Change note colours.
- Delete notes.

### Persistence and usability

- Automatically save drawings and sticky notes in browser local storage.
- Restore saved board content after refreshing the page.
- Keyboard shortcuts for common actions.
- Automated frontend tests for drawing interactions, sticky notes, persistence, keyboard shortcuts, and PNG export.
- ESLint, Prettier, and Husky tooling for code quality.

## Technology stack

| Area                            | Technology                                       |
| ------------------------------- | ------------------------------------------------ |
| Frontend                        | React 19, TypeScript, Vite                       |
| Drawing                         | HTML Canvas API                                  |
| Styling                         | CSS                                              |
| Backend                         | Node.js, TypeScript, native HTTP                 |
| Package management              | pnpm workspaces                                  |
| Testing                         | Vitest, React Testing Library, user-event, jsdom |
| Code quality                    | ESLint, Prettier                                 |
| Git hooks                       | Husky, lint-staged                               |
| Local persistence               | Browser local storage                            |
| Image export                    | Canvas API, PNG                                  |
| Planned database                | PostgreSQL                                       |
| Planned validation              | Zod                                              |
| Planned real-time communication | Socket.IO                                        |
| Planned AI experimentation      | Ollama or a compatible AI provider               |

## Project structure

```text
ai-whiteboard/
├── .github/                 # Repository workflows and templates
├── .husky/                  # Git hooks
├── backend/
│   └── src/
│       └── index.ts         # HTTP server and health endpoint
├── frontend/
│   └── src/
│       ├── App.tsx          # Whiteboard UI and interactions
│       ├── App.css          # Whiteboard styles
│       ├── index.css        # Global styles
│       ├── App.test.tsx     # UI and interaction tests
│       ├── test-setup.ts    # Test environment setup
│       └── boardOperations.test.ts
├── eslint.config.js
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

## Getting started

### Prerequisites

- Node.js 22.12 or later.
- pnpm 12.11.2.
- Git.

Check your installed versions:

```bash
node --version
pnpm --version
git --version
```

### Installation

Clone the repository and install its dependencies:

```bash
git clone https://github.com/mokone-september/ai-whiteboard.git
cd ai-whiteboard
pnpm install
```

### Run the application

Start both services together:

```bash
pnpm run dev
```

Alternatively, start the frontend and backend in separate terminals.

Frontend:

```bash
pnpm run dev:frontend
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

Backend:

```bash
pnpm run dev:backend
```

The backend listens on `127.0.0.1:3000` by default.

### Verify the backend

Check the health endpoint:

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

## Using the whiteboard

1. Start the application and open the frontend in your browser.
2. Choose **Pen** to draw freehand, **Shape** to draw rectangles, or **Eraser** to erase drawing content.
3. Adjust the drawing colour and stroke thickness as needed.
4. Choose **Select** to select and move an existing stroke.
5. Use **Undo** to reverse the most recent drawing operation.
6. Select a stroke and use the delete action or keyboard shortcut to remove it.
7. Use **Clear drawings** to remove drawing strokes from the board.
8. Create a sticky note to add an idea or reminder.
9. Edit the note, change its colour, move it, or delete it as needed.
10. Select **Export PNG** to download an image of the board.
11. Refresh the page to verify that locally saved drawings and notes are restored.

## Keyboard shortcuts

| Shortcut               | Action                           |
| ---------------------- | -------------------------------- |
| `P`                    | Switch to the pen tool           |
| `E`                    | Switch to the eraser tool        |
| `N`                    | Create a sticky note             |
| `Delete` / `Backspace` | Delete a selected drawing stroke |

Shortcuts are intended for use when focus is not inside a text-editing control.

## Data and persistence

The current implementation uses browser local storage to save drawing strokes and sticky notes.

- Board content is restored when the application reloads in the same browser profile.
- Drawing and note changes are saved locally.
- Content is not synchronised between browsers, devices, or users.
- Clearing the browser's site data can remove saved board content.
- The backend currently provides a health endpoint; it does not yet persist whiteboard content.
- User accounts, multiple saved boards, and server-side persistence are not yet implemented.

Avoid storing sensitive information in the whiteboard.

## Available commands

Run these commands from the repository root.

| Command                                            | Purpose                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| `pnpm run dev`                                     | Start frontend and backend together                 |
| `pnpm run dev:frontend`                            | Start the frontend development server               |
| `pnpm run dev:backend`                             | Start the backend development server                |
| `pnpm run build`                                   | Build workspace packages that define a build script |
| `pnpm run build:frontend`                          | Build the frontend                                  |
| `pnpm run build:backend`                           | Build the backend                                   |
| `pnpm run lint`                                    | Run workspace lint scripts                          |
| `pnpm run lint:frontend`                           | Lint the frontend                                   |
| `pnpm run lint:backend`                            | Lint the backend                                    |
| `pnpm run format`                                  | Format project files                                |
| `pnpm run format:check`                            | Check formatting without modifying files            |
| `pnpm --filter @ai-whiteboard/frontend test`       | Run frontend tests                                  |
| `pnpm --filter @ai-whiteboard/frontend test:watch` | Run frontend tests in watch mode                    |

### Quality checks

Run the frontend test suite:

```bash
pnpm --filter @ai-whiteboard/frontend test
```

Run linting and the production build:

```bash
pnpm --filter @ai-whiteboard/frontend lint
pnpm --filter @ai-whiteboard/frontend build
```

Run the workspace-wide checks:

```bash
pnpm run format:check
pnpm run lint
pnpm run build
```

## API

### `GET /health`

Returns the backend service health status.

**Success response:** `200 OK`

```json
{
  "status": "ok",
  "service": "ai-whiteboard-backend"
}
```

Unknown routes currently return `404 Not Found`.

## Development roadmap

### Phase 1 — Interactive whiteboard

- [x] Implement the whiteboard interface.
- [x] Add freehand drawing and rectangle shapes.
- [x] Add colour selection and adjustable stroke thickness.
- [x] Add an eraser, selection, movement, and deletion of strokes.
- [x] Add Undo and Clear actions.
- [x] Create, edit, move, recolour, and delete sticky notes.
- [x] Save and restore board content using local storage.
- [x] Export the board as PNG.
- [x] Add automated frontend tests for core interactions.
- [ ] Continue improving accessibility and responsive behaviour.

### Phase 2 — Backend API

- [x] Create a Node.js HTTP server.
- [x] Add a health endpoint.
- [ ] Design REST endpoints for boards and board objects.
- [ ] Validate incoming requests.
- [ ] Standardise error responses.
- [ ] Add API tests.

### Phase 3 — Persistent storage

- [ ] Integrate PostgreSQL.
- [ ] Design the board and object schema.
- [ ] Save and load boards through the backend.
- [ ] Add loading, empty, and error states.

### Phase 4 — Real-time collaboration

- [ ] Integrate Socket.IO.
- [ ] Create rooms for individual boards.
- [ ] Synchronise changes between connected users.
- [ ] Handle reconnections and simultaneous edits.

### Phase 5 — AI-assisted planning

- [ ] Evaluate local AI models using Ollama where hardware permits.
- [ ] Summarise notes and brainstorming sessions.
- [ ] Generate actionable tasks from board content.
- [ ] Explore privacy-conscious AI workflows.

### Phase 6 — Delivery and observability

- [ ] Add automated CI checks with GitHub Actions.
- [ ] Add deployment configuration.
- [ ] Introduce monitoring and error reporting.
- [ ] Evaluate analytics where useful and appropriate.

## Project goals

This project is being developed incrementally to practise frontend engineering, TypeScript, automated testing, backend API design, persistence, real-time systems, and AI integration.

The focus is on building and testing working functionality before introducing additional infrastructure or external services.
