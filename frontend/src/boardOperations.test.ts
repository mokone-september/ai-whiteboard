import { describe, expect, it } from "vitest";
import {
  addStroke,
  changeStickyNoteColor,
  clearStrokes,
  deleteStickyNote,
  moveStroke,
  recolorStroke,
  undoStrokes,
  updateStickyNote,
} from "./boardOperations";
import type { StickyNote, Stroke } from "./boardOperations";

const firstStroke: Stroke = {
  tool: "pen",
  color: "#202124",
  size: 4,
  points: [
    { x: 10, y: 20 },
    { x: 30, y: 40 },
  ],
};

const secondStroke: Stroke = {
  tool: "rectangle",
  color: "#2563eb",
  size: 2,
  points: [
    { x: 5, y: 5 },
    { x: 50, y: 40 },
  ],
};

const firstNote: StickyNote = {
  id: "note-1",
  text: "Initial idea",
  x: 20,
  y: 30,
  color: "#fff1a8",
};

const secondNote: StickyNote = {
  id: "note-2",
  text: "Another idea",
  x: 100,
  y: 120,
  color: "#dbeafe",
};

const noteColors = ["#fff1a8", "#ffd8be", "#d8f5d0", "#dbeafe", "#f3d9fa"];

describe("drawing history", () => {
  it("adds a completed stroke to the history", () => {
    expect(addStroke([firstStroke], secondStroke)).toEqual([firstStroke, secondStroke]);
  });

  it("undoes only the most recent stroke", () => {
    expect(undoStrokes([firstStroke, secondStroke])).toEqual([firstStroke]);
  });

  it("returns an empty history when undoing an empty history", () => {
    expect(undoStrokes([])).toEqual([]);
  });

  it("clears all strokes", () => {
    expect(clearStrokes()).toEqual([]);
  });

  it("does not mutate the original history when undoing", () => {
    const history = [firstStroke, secondStroke];

    undoStrokes(history);

    expect(history).toEqual([firstStroke, secondStroke]);
  });
});

describe("drawing editing", () => {
  it("moves every point of the selected stroke", () => {
    expect(moveStroke([firstStroke, secondStroke], 0, 5, -10)).toEqual([
      {
        ...firstStroke,
        points: [
          { x: 15, y: 10 },
          { x: 35, y: 30 },
        ],
      },
      secondStroke,
    ]);
  });

  it("recolours only the selected stroke", () => {
    expect(recolorStroke([firstStroke, secondStroke], 1, "#16a34a")).toEqual([
      firstStroke,
      { ...secondStroke, color: "#16a34a" },
    ]);
  });

  it("leaves history unchanged when a stroke index does not exist", () => {
    const history = [firstStroke];

    expect(moveStroke(history, 5, 10, 10)).toBe(history);
    expect(recolorStroke(history, 5, "#16a34a")).toBe(history);
  });
});

describe("sticky-note editing", () => {
  it("updates the selected note's text only", () => {
    expect(updateStickyNote([firstNote, secondNote], "note-1", "Updated idea")).toEqual([
      { ...firstNote, text: "Updated idea" },
      secondNote,
    ]);
  });

  it("changes a note's colour when the colour is allowed", () => {
    expect(changeStickyNoteColor([firstNote, secondNote], "note-1", "#ffd8be", noteColors)).toEqual(
      [{ ...firstNote, color: "#ffd8be" }, secondNote],
    );
  });

  it("rejects colours outside the palette", () => {
    const notes = [firstNote, secondNote];

    expect(changeStickyNoteColor(notes, "note-1", "#000000", noteColors)).toBe(notes);
  });

  it("deletes only the requested note", () => {
    expect(deleteStickyNote([firstNote, secondNote], "note-1")).toEqual([secondNote]);
  });

  it("keeps notes unchanged when the requested ID does not exist", () => {
    const notes = [firstNote, secondNote];

    expect(deleteStickyNote(notes, "missing-note")).toEqual(notes);
  });
});
