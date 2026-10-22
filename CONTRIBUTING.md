# Contributing to AI Whiteboard

Thank you for your interest in AI Whiteboard!

This is an actively developed learning and portfolio project. Contributions,
bug reports, suggestions, and constructive feedback are welcome.

## Development setup

### Prerequisites

- Node.js compatible with the version used by the project
- pnpm
- Git

### Get started

1. Clone the repository.
2. Enter the project directory.
3. Install dependencies.
4. Start the frontend or backend as needed.

```bash
git clone https://github.com/mokone-september/ai-whiteboard.git
cd ai-whiteboard
pnpm install --frozen-lockfile
```

Start the frontend:

```bash
pnpm run dev:frontend
```

Start the backend in a separate terminal:

```bash
pnpm run dev:backend
```

Check the README and workspace package scripts for current setup details.

## Before submitting changes

Run the relevant checks from the repository root:

```bash
pnpm run format:check
pnpm run lint
pnpm run build
```

Resolve any failures caused by your changes before submitting them.

## Contribution guidelines

- Keep changes focused and explain their purpose.
- Follow the existing TypeScript, ESLint, and Prettier conventions.
- Preserve the separation between frontend and backend.
- Avoid introducing dependencies without a clear need.
- Never commit secrets, credentials, or personal data.
- Update documentation when behavior, setup, or commands change.
- Do not describe planned functionality as implemented.

## Git workflow

1. Create a branch for your change.
2. Make focused commits with descriptive messages.
3. Run the relevant checks.
4. Push your branch and open a pull request when contributing collaboratively.
5. Describe the change, how it was tested, and any limitations.

Suggested branch names:

- `feat/whiteboard-canvas`
- `fix/api-health-check`
- `docs/update-setup-guide`

Suggested commit prefixes:

- `feat:` for new functionality
- `fix:` for bug fixes
- `docs:` for documentation
- `chore:` for maintenance
- `test:` for tests

## Reporting issues

When reporting a problem, include the steps to reproduce it, expected behavior,
actual behavior, and relevant error output. Remove secrets and private data
before sharing logs.

## Project status

The whiteboard, persistence, real-time collaboration, and AI capabilities are
roadmap items until they are implemented and verified. Check the README for
current progress.
