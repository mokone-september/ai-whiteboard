import assert from "node:assert/strict";
import { test } from "node:test";
import { createBoard, parseBoardInput } from "./board.js";

test("defaults missing optional board fields", () => {
  assert.deepEqual(parseBoardInput({}), {
    name: "Untitled board",
    strokes: [],
    notes: [],
  });
});

test("trims valid board names", () => {
  assert.deepEqual(parseBoardInput({ name: "  Planning  " }), {
    name: "Planning",
    strokes: [],
    notes: [],
  });
});

test("rejects blank and excessively long board names", () => {
  assert.equal(parseBoardInput({ name: "   " }), null);
  assert.equal(parseBoardInput({ name: "a".repeat(121) }), null);
});

test("rejects invalid stroke tools and non-finite coordinates", () => {
  assert.equal(
    parseBoardInput({
      strokes: [{ tool: "laser", color: "#000", size: 2, points: [] }],
    }),
    null,
  );

  assert.equal(
    parseBoardInput({
      strokes: [
        {
          tool: "pen",
          color: "#000",
          size: 2,
          points: [{ x: Number.NaN, y: 1 }],
        },
      ],
    }),
    null,
  );
});

test("rejects sticky notes with unsupported colors", () => {
  assert.equal(
    parseBoardInput({
      notes: [
        {
          id: "note-1",
          text: "Hello",
          x: 10,
          y: 20,
          color: "#000000",
        },
      ],
    }),
    null,
  );
});

test("can require all board fields for updates", () => {
  assert.equal(parseBoardInput({ name: "Planning" }, true), null);

  assert.deepEqual(parseBoardInput({ name: "Planning", strokes: [], notes: [] }, true), {
    name: "Planning",
    strokes: [],
    notes: [],
  });
});

test("creates boards with IDs and matching initial timestamps", () => {
  const board = createBoard({
    name: "Planning",
    strokes: [],
    notes: [],
  });

  assert.ok(board.id.length > 0);
  assert.equal(board.name, "Planning");
  assert.equal(board.createdAt, board.updatedAt);
  assert.deepEqual(board.strokes, []);
  assert.deepEqual(board.notes, []);
});
