import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const STROKES_KEY = "ai-whiteboard-strokes";
const NOTES_KEY = "ai-whiteboard-notes";
const CANVAS_LABEL = /interactive whiteboard/i;

type SavedStroke = {
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
};

type SavedNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

function getCanvas(): HTMLCanvasElement {
  const canvas = screen.getByLabelText(CANVAS_LABEL);

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Expected the whiteboard canvas to be a canvas element.");
  }

  return canvas;
}

function mockBoardDimensions(): HTMLElement {
  const shell = document.querySelector(".canvas-shell");

  if (!(shell instanceof HTMLElement)) {
    throw new Error("Could not find the whiteboard canvas shell.");
  }

  Object.defineProperty(shell, "clientWidth", {
    configurable: true,
    value: 500,
  });

  Object.defineProperty(shell, "clientHeight", {
    configurable: true,
    value: 400,
  });

  shell.getBoundingClientRect = vi.fn(
    () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 500,
        bottom: 400,
        width: 500,
        height: 400,
        toJSON: () => ({}),
      }) as DOMRect,
  );

  return shell;
}

async function drawStroke(
  user: ReturnType<typeof userEvent.setup>,
  start = { x: 30, y: 40 },
  end = { x: 100, y: 120 },
): Promise<void> {
  const canvas = getCanvas();

  await user.click(screen.getByRole("button", { name: /pen/i }));

  fireEvent.pointerDown(canvas, {
    pointerId: 1,
    button: 0,
    clientX: start.x,
    clientY: start.y,
  });

  fireEvent.pointerMove(canvas, {
    pointerId: 1,
    buttons: 1,
    clientX: end.x,
    clientY: end.y,
  });

  fireEvent.pointerUp(canvas, {
    pointerId: 1,
    button: 0,
    clientX: end.x,
    clientY: end.y,
  });
}

function getStickyNote(name?: string): HTMLElement {
  const notes = document.querySelectorAll(".sticky-note");

  if (notes.length === 0) {
    throw new Error("Expected at least one sticky note.");
  }

  if (name) {
    const note = Array.from(notes).find((element) => element.textContent?.includes(name));

    if (!(note instanceof HTMLElement)) {
      throw new Error(`Could not find sticky note containing "${name}".`);
    }

    return note;
  }

  const note = notes[0];

  if (!(note instanceof HTMLElement)) {
    throw new Error("Expected a sticky note element.");
  }

  return note;
}

async function waitForSavedNotes(count: number): Promise<SavedNote[]> {
  await waitFor(() => {
    expect(readSavedNotes()).toHaveLength(count);
  });

  return readSavedNotes();
}

async function waitForSavedStrokes(count: number): Promise<SavedStroke[]> {
  await waitFor(() => {
    expect(readSavedStrokes()).toHaveLength(count);
  });

  return readSavedStrokes();
}

function readSavedNotes(): SavedNote[] {
  const saved = localStorage.getItem(NOTES_KEY);

  if (!saved) {
    return [];
  }

  return JSON.parse(saved) as SavedNote[];
}

function readSavedStrokes(): SavedStroke[] {
  const saved = localStorage.getItem(STROKES_KEY);

  if (!saved) {
    return [];
  }

  return JSON.parse(saved) as SavedStroke[];
}

beforeEach(() => {
  localStorage.clear();

  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );

  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    window.clearTimeout(id);
  });

  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => true),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the toolbar, tools, and whiteboard canvas", () => {
    render(<App />);

    expect(getCanvas()).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Select", exact: true })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /pen/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /eraser/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /shape/i })).toBeInTheDocument();
  });

  it("creates a sticky note and persists it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    expect(document.querySelector(".sticky-note")).toBeInTheDocument();

    const notes = await waitForSavedNotes(1);

    expect(notes[0].text).toBe("");
  });

  it("edits sticky-note text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();
    const textbox = within(note).getByRole("textbox");

    await user.clear(textbox);
    await user.type(textbox, "My whiteboard idea");

    await waitFor(() => {
      expect(readSavedNotes()[0].text).toBe("My whiteboard idea");
    });

    expect(textbox).toHaveValue("My whiteboard idea");
  });

  it("changes a note colour and persists the change", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();

    const colorButton = within(note).getByRole("button", {
      name: "Change note colour to #ffd8be",
    });

    await user.click(colorButton);

    await waitFor(() => {
      expect(readSavedNotes()[0].color).toBe("#ffd8be");
    });
  });

  it("deletes a sticky note", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    expect(document.querySelectorAll(".sticky-note")).toHaveLength(1);

    const note = getStickyNote();

    await user.click(within(note).getByRole("button", { name: /delete sticky note/i }));

    await waitFor(() => {
      expect(document.querySelectorAll(".sticky-note")).toHaveLength(0);
      expect(readSavedNotes()).toHaveLength(0);
    });
  });

  it("restores saved sticky notes", async () => {
    const savedNote: SavedNote = {
      id: "saved-note-1",
      text: "Saved note",
      x: 80,
      y: 60,
      color: "#d8f5d0",
    };

    localStorage.setItem(NOTES_KEY, JSON.stringify([savedNote]));

    render(<App />);

    expect(screen.getByDisplayValue("Saved note")).toBeInTheDocument();

    await waitFor(() => {
      expect(readSavedNotes()).toEqual([savedNote]);
    });
  });

  it("draws a stroke and persists its points", async () => {
    const user = userEvent.setup();
    render(<App />);

    await drawStroke(user);

    const strokes = await waitForSavedStrokes(1);
    const [stroke] = strokes;

    expect(stroke.points.length).toBeGreaterThanOrEqual(2);
    expect(stroke.tool).toBe("pen");
  });

  it("undoes the most recent stroke", async () => {
    const user = userEvent.setup();
    render(<App />);

    await drawStroke(user);
    await waitForSavedStrokes(1);

    await user.click(screen.getByRole("button", { name: /undo/i }));

    await waitForSavedStrokes(0);
  });

  it("clears all strokes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await drawStroke(user);
    await waitForSavedStrokes(1);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    const clearConfirmation = screen.queryByRole("button", {
      name: /confirm clear|clear all|yes, clear/i,
    });

    if (clearConfirmation) {
      await user.click(clearConfirmation);
    }

    await waitForSavedStrokes(0);
  });

  it("moves a selected stroke and persists the updated coordinates", async () => {
    const user = userEvent.setup();
    render(<App />);

    mockBoardDimensions();
    await drawStroke(user);

    const [initialStroke] = await waitForSavedStrokes(1);
    const before = initialStroke.points.map((point) => ({ ...point }));

    await user.click(screen.getByRole("button", { name: "Select", exact: true }));

    const canvas = getCanvas();

    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      button: 0,
      clientX: 60,
      clientY: 80,
    });

    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      buttons: 1,
      clientX: 100,
      clientY: 110,
    });

    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 110,
    });

    await waitFor(() => {
      const [afterStroke] = readSavedStrokes();

      expect(afterStroke.points).not.toEqual(before);
    });
  });

  it("deletes a selected stroke with the Delete key", async () => {
    const user = userEvent.setup();
    render(<App />);

    mockBoardDimensions();
    await drawStroke(user);
    await waitForSavedStrokes(1);

    await user.click(screen.getByRole("button", { name: "Select", exact: true }));

    const canvas = getCanvas();

    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      button: 0,
      clientX: 60,
      clientY: 80,
    });

    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      button: 0,
      clientX: 60,
      clientY: 80,
    });

    fireEvent.keyDown(window, { key: "Delete" });

    await waitForSavedStrokes(0);
  });

  it("creates a sticky note with the N shortcut", async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "n" });

    await waitFor(() => {
      expect(document.querySelectorAll(".sticky-note").length).toBeGreaterThan(0);
    });
  });

  it("switches tools with keyboard shortcuts", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "e" });

    expect(screen.getByRole("button", { name: /eraser/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "p" });

    expect(screen.getByRole("button", { name: /pen/i })).toBeInTheDocument();
  });

  it("does not trigger shortcuts while typing in a note", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();
    const textbox = within(note).getByRole("textbox");

    await user.click(textbox);
    await user.type(textbox, "n");

    expect(textbox).toHaveValue("n");
    expect(document.querySelectorAll(".sticky-note")).toHaveLength(1);
  });

  it("moves a sticky note exactly 10 pixels with an arrow key", async () => {
    const user = userEvent.setup();
    render(<App />);

    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();
    const [before] = await waitForSavedNotes(1);

    note.focus();
    fireEvent.keyDown(note, { key: "ArrowRight" });

    await waitFor(() => {
      const [after] = readSavedNotes();

      expect(after.x).toBe(before.x + 10);
      expect(after.y).toBe(before.y);
    });
  });

  it("moves a sticky note exactly one pixel with Shift and an arrow key", async () => {
    const user = userEvent.setup();
    render(<App />);

    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();
    const [before] = await waitForSavedNotes(1);

    note.focus();
    fireEvent.keyDown(note, {
      key: "ArrowRight",
      shiftKey: true,
    });

    await waitFor(() => {
      const [after] = readSavedNotes();

      expect(after.x).toBe(before.x + 1);
      expect(after.y).toBe(before.y);
    });
  });

  it("keeps a sticky note within the board boundaries", async () => {
    const user = userEvent.setup();
    render(<App />);

    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote();

    for (let index = 0; index < 10; index += 1) {
      fireEvent.keyDown(note, { key: "ArrowLeft" });
    }

    await waitFor(() => {
      const [savedNote] = readSavedNotes();

      expect(savedNote.x).toBe(0);
      expect(savedNote.y).toBeGreaterThanOrEqual(0);
      expect(savedNote.y).toBeLessThanOrEqual(400);
    });
  });

  it("undoes and redoes strokes with keyboard shortcuts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await drawStroke(user);
    await waitForSavedStrokes(1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    await waitForSavedStrokes(0);

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });

    await waitForSavedStrokes(1);
  });

  it("ignores malformed saved sticky-note data", () => {
    localStorage.setItem(NOTES_KEY, "{not valid JSON");

    expect(() => render(<App />)).not.toThrow();
    expect(getCanvas()).toBeInTheDocument();
  });

  it("ignores malformed saved stroke data", () => {
    localStorage.setItem(STROKES_KEY, "{not valid JSON");

    expect(() => render(<App />)).not.toThrow();
    expect(getCanvas()).toBeInTheDocument();
  });

  it("ignores malformed saved note and stroke data together", () => {
    localStorage.setItem(NOTES_KEY, "{bad notes");
    localStorage.setItem(STROKES_KEY, "{bad strokes");

    expect(() => render(<App />)).not.toThrow();
    expect(getCanvas()).toBeInTheDocument();
  });

  it("exports the whiteboard as a PNG", async () => {
    const user = userEvent.setup();
    const originalCreateElement = document.createElement.bind(document);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    let exportCanvas: HTMLCanvasElement | undefined;
    let exportedBlob: Blob | undefined;

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
      options?: ElementCreationOptions,
    ) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === "canvas") {
        exportCanvas = element as HTMLCanvasElement;

        vi.spyOn(exportCanvas, "getContext").mockReturnValue({
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          setTransform: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
        } as unknown as CanvasRenderingContext2D);

        vi.spyOn(exportCanvas, "toBlob").mockImplementation((callback, type) => {
          exportedBlob = new Blob(["png"], {
            type: type ?? "image/png",
          });

          callback(exportedBlob);
        });
      }

      return element;
    }) as typeof document.createElement);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /export|download/i }));

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith("canvas");
      expect(exportCanvas).toBeDefined();
      expect(exportCanvas?.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    });

    expect(exportedBlob).toBeInstanceOf(Blob);
    expect(exportedBlob?.type).toBe("image/png");
    expect(anchorClick).toHaveBeenCalled();
  });
});
