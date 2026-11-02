import { randomUUID } from "node:crypto";

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  tool: "pen" | "eraser" | "rectangle";
  color: string;
  size: number;
  points: Point[];
};

export type StickyNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

export type Board = {
  id: string;
  name: string;
  strokes: Stroke[];
  notes: StickyNote[];
  createdAt: string;
  updatedAt: string;
};

const NOTE_COLORS = new Set(["#fff1a8", "#ffd8be", "#d8f5d0", "#dbeafe", "#f3d9fa"]);

const MAX_ITEMS = 10_000;
const MAX_POINTS_PER_STROKE = 10_000;
const MAX_NOTE_TEXT_LENGTH = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStroke(value: unknown): value is Stroke {
  if (!isRecord(value)) return false;

  if (value.tool !== "pen" && value.tool !== "eraser" && value.tool !== "rectangle") {
    return false;
  }

  if (
    typeof value.color !== "string" ||
    value.color.length === 0 ||
    value.color.length > 50 ||
    !isFiniteNumber(value.size) ||
    value.size <= 0 ||
    !Array.isArray(value.points) ||
    value.points.length > MAX_POINTS_PER_STROKE
  ) {
    return false;
  }

  return value.points.every(
    (point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y),
  );
}

function isStickyNote(value: unknown): value is StickyNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 100 &&
    typeof value.text === "string" &&
    value.text.length <= MAX_NOTE_TEXT_LENGTH &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    typeof value.color === "string" &&
    NOTE_COLORS.has(value.color)
  );
}

export type BoardInput = {
  name: string;
  strokes: Stroke[];
  notes: StickyNote[];
};

export function parseBoardInput(value: unknown, requireAllFields = false): BoardInput | null {
  if (!isRecord(value)) return null;

  const { name, strokes, notes } = value;

  if (
    (name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 120)) ||
    (strokes !== undefined &&
      (!Array.isArray(strokes) || strokes.length > MAX_ITEMS || !strokes.every(isStroke))) ||
    (notes !== undefined &&
      (!Array.isArray(notes) || notes.length > MAX_ITEMS || !notes.every(isStickyNote)))
  ) {
    return null;
  }

  if (requireAllFields && (name === undefined || strokes === undefined || notes === undefined)) {
    return null;
  }

  return {
    name: typeof name === "string" ? name.trim() : "Untitled board",
    strokes: strokes === undefined ? [] : (strokes as Stroke[]),
    notes: notes === undefined ? [] : (notes as StickyNote[]),
  };
}

export function createBoard(input: BoardInput): Board {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    name: input.name,
    strokes: input.strokes,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}
