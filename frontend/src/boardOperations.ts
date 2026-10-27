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

/** Append a completed drawing to the drawing history. */
export function addStroke(strokes: Stroke[], stroke: Stroke): Stroke[] {
  return [...strokes, stroke];
}

/** Remove the most recent drawing, leaving the original array untouched. */
export function undoStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

/** Remove all drawings without affecting sticky notes. */
export function clearStrokes(): Stroke[] {
  return [];
}

/** Move a drawing by an offset while preserving its other properties. */
export function moveStroke(
  strokes: Stroke[],
  index: number,
  deltaX: number,
  deltaY: number,
): Stroke[] {
  if (!strokes[index]) return strokes;

  return strokes.map((stroke, strokeIndex) =>
    strokeIndex === index
      ? {
          ...stroke,
          points: stroke.points.map((point) => ({
            x: point.x + deltaX,
            y: point.y + deltaY,
          })),
        }
      : stroke,
  );
}

/** Recolour one drawing without modifying the remaining drawings. */
export function recolorStroke(strokes: Stroke[], index: number, color: string): Stroke[] {
  if (!strokes[index]) return strokes;

  return strokes.map((stroke, strokeIndex) =>
    strokeIndex === index ? { ...stroke, color } : stroke,
  );
}

/** Update a sticky note's text while preserving its position and colour. */
export function updateStickyNote(notes: StickyNote[], id: string, text: string): StickyNote[] {
  return notes.map((note) => (note.id === id ? { ...note, text } : note));
}

/** Only allow colours explicitly provided by the board's palette. */
export function changeStickyNoteColor(
  notes: StickyNote[],
  id: string,
  color: string,
  allowedColors: readonly string[],
): StickyNote[] {
  if (!allowedColors.includes(color)) return notes;

  return notes.map((note) => (note.id === id ? { ...note, color } : note));
}

/** Delete one sticky note without changing the others. */
export function deleteStickyNote(notes: StickyNote[], id: string): StickyNote[] {
  return notes.filter((note) => note.id !== id);
}
