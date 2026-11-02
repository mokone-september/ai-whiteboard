import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createBoard, parseBoardInput, type Board } from "./board.js";

const MAX_BODY_BYTES = 1_048_576;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }

    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

function requireJsonContentType(request: IncomingMessage): void {
  const contentType = request.headers["content-type"];

  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();

  if (mediaType !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
}

export function createAppServer() {
  const boards = new Map<string, Board>();

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = url.pathname;
      const method = request.method ?? "GET";

      if (method === "GET" && pathname === "/health") {
        sendJson(response, 200, {
          data: { status: "ok", service: "ai-whiteboard-backend" },
        });
        return;
      }

      if (method === "GET" && pathname === "/api/boards") {
        sendJson(response, 200, { data: [...boards.values()] });
        return;
      }

      if (pathname === "/api/boards" && method === "POST") {
        requireJsonContentType(request);

        const input = parseBoardInput(await readJson(request));

        if (!input) {
          throw new HttpError(
            400,
            "INVALID_BOARD",
            "Provide a valid board name, strokes, and notes.",
          );
        }

        const board = createBoard(input);
        boards.set(board.id, board);
        sendJson(response, 201, { data: board });
        return;
      }

      const match = /^\/api\/boards\/([^/]+)$/.exec(pathname);

      if (match) {
        let id: string;

        try {
          id = decodeURIComponent(match[1] ?? "");
        } catch {
          throw new HttpError(400, "INVALID_ID", "Board ID is invalid.");
        }

        if (!id) {
          throw new HttpError(400, "INVALID_ID", "Board ID is required.");
        }

        if (method === "GET") {
          const board = boards.get(id);

          if (!board) {
            throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found.");
          }

          sendJson(response, 200, { data: board });
          return;
        }

        if (method === "PUT") {
          requireJsonContentType(request);

          const existing = boards.get(id);

          if (!existing) {
            throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found.");
          }

          const input = parseBoardInput(await readJson(request), true);

          if (!input) {
            throw new HttpError(
              400,
              "INVALID_BOARD",
              "A valid board name, strokes, and notes are required.",
            );
          }

          const updated: Board = {
            ...existing,
            ...input,
            updatedAt: new Date().toISOString(),
          };

          boards.set(id, updated);
          sendJson(response, 200, { data: updated });
          return;
        }

        if (method === "DELETE") {
          if (!boards.has(id)) {
            throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found.");
          }

          boards.delete(id);
          response.writeHead(204);
          response.end();
          return;
        }

        response.setHeader("Allow", "GET, PUT, DELETE");
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
      }

      if (pathname === "/api/boards") {
        response.setHeader("Allow", "GET, POST");
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
      }

      throw new HttpError(404, "NOT_FOUND", "Route not found.");
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }

      if (error instanceof HttpError) {
        sendJson(response, error.status, {
          error: { code: error.code, message: error.message },
        });
        return;
      }

      sendJson(response, 500, {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        },
      });
    }
  });
}
