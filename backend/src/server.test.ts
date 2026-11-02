import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createAppServer } from "./server.js";

const server = createAppServer();
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function jsonRequest(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    response,
    body: response.status === 204 ? null : await response.json(),
  };
}

test("health endpoint returns service status", async () => {
  const { response, body } = await jsonRequest("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    status: "ok",
    service: "ai-whiteboard-backend",
  });
});

test("creates and retrieves a board", async () => {
  const created = await jsonRequest("/api/boards", "POST", {
    name: "Test board",
    strokes: [],
    notes: [],
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.name, "Test board");

  const id = created.body.data.id as string;
  const retrieved = await jsonRequest(`/api/boards/${id}`);

  assert.equal(retrieved.response.status, 200);
  assert.equal(retrieved.body.data.id, id);
  assert.equal(retrieved.body.data.name, "Test board");
});

test("lists created boards", async () => {
  const created = await jsonRequest("/api/boards", "POST", {
    name: "List test",
  });

  assert.equal(created.response.status, 201);

  const result = await jsonRequest("/api/boards");

  assert.equal(result.response.status, 200);
  assert.ok(result.body.data.some((board: { id: string }) => board.id === created.body.data.id));
});

test("updates a board and preserves its ID and creation time", async () => {
  const created = await jsonRequest("/api/boards", "POST", {
    name: "Before",
  });

  const original = created.body.data;
  const updated = await jsonRequest(`/api/boards/${original.id}`, "PUT", {
    name: "After",
    strokes: [],
    notes: [],
  });

  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.name, "After");
  assert.equal(updated.body.data.id, original.id);
  assert.equal(updated.body.data.createdAt, original.createdAt);
});

test("deletes a board", async () => {
  const created = await jsonRequest("/api/boards", "POST", {
    name: "Delete me",
  });

  const id = created.body.data.id as string;
  const deleted = await jsonRequest(`/api/boards/${id}`, "DELETE");

  assert.equal(deleted.response.status, 204);

  const retrieved = await jsonRequest(`/api/boards/${id}`);
  assert.equal(retrieved.response.status, 404);
  assert.equal(retrieved.body.error.code, "BOARD_NOT_FOUND");
});

test("rejects malformed board data", async () => {
  const result = await jsonRequest("/api/boards", "POST", {
    name: "Invalid",
    strokes: [{ tool: "laser", color: "#000", size: 2, points: [] }],
    notes: [],
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.body.error.code, "INVALID_BOARD");
});

test("rejects malformed JSON and unsupported content types", async () => {
  const malformed = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_JSON");

  const unsupported = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });

  assert.equal(unsupported.status, 415);
});

test("returns a consistent error for unknown routes", async () => {
  const result = await jsonRequest("/unknown");

  assert.equal(result.response.status, 404);
  assert.equal(result.body.error.code, "NOT_FOUND");
});

test("rejects malformed JSON content types", async () => {
  const result = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json-invalid" },
    body: "{}",
  });

  assert.equal(result.status, 415);
  assert.equal((await result.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");
});

test("accepts JSON content types with parameters", async () => {
  const result = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ name: "Parameterized JSON" }),
  });

  assert.equal(result.status, 201);
});

test("returns 404 when retrieving or deleting a missing board", async () => {
  const missingId = "board-that-does-not-exist";

  const retrieved = await jsonRequest(`/api/boards/${missingId}`);
  assert.equal(retrieved.response.status, 404);
  assert.equal(retrieved.body.error.code, "BOARD_NOT_FOUND");

  const deleted = await jsonRequest(`/api/boards/${missingId}`, "DELETE");
  assert.equal(deleted.response.status, 404);
  assert.equal(deleted.body.error.code, "BOARD_NOT_FOUND");
});

test("rejects incomplete board updates without modifying the board", async () => {
  const created = await jsonRequest("/api/boards", "POST", {
    name: "Keep this board",
    strokes: [],
    notes: [],
  });

  assert.equal(created.response.status, 201);
  const id = created.body.data.id as string;

  const updated = await jsonRequest(`/api/boards/${id}`, "PUT", {
    name: "Incomplete update",
  });

  assert.equal(updated.response.status, 400);
  assert.equal(updated.body.error.code, "INVALID_BOARD");

  const retrieved = await jsonRequest(`/api/boards/${id}`);
  assert.equal(retrieved.response.status, 200);
  assert.equal(retrieved.body.data.name, "Keep this board");
});

test("rejects request bodies larger than 1 MiB", async () => {
  const response = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "x".repeat(1_048_577),
  });

  assert.equal(response.status, 413);

  const body = await response.json();
  assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
});
