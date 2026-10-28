import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const STROKES_KEY = "ai-whiteboard-strokes";
const NOTES_KEY = "ai-whiteboard-notes";
const CANVAS_LABEL = "Interactive whiteboard. Select a drawing tool and draw on the canvas.";

function getCanvas(): HTMLCanvasElement {
  const canvas = screen.getByLabelText(CANVAS_LABEL) as HTMLCanvasElement;

  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 500,
    bottom: 400,
    width: 500,
    height: 400,
    toJSON: () => ({}),
  });

  return canvas;
}

function mockBoardDimensions(): HTMLElement {
  const board = document.querySelector(".canvas-shell");

  if (!(board instanceof HTMLElement)) {
    throw new Error("Whiteboard canvas shell was not found");
  }

  Object.defineProperties(board, {
    clientWidth: { configurable: true, value: 500 },
    clientHeight: { configurable: true, value: 400 },
  });

  return board;
}

function getStickyNote(name: string): HTMLElement {
  return screen.getByRole("article", {
    name: `Sticky note: ${name}`,
  });
}

beforeEach(() => {
  localStorage.clear();

  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);

  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );

  vi.stubGlobal(
    "URL",
    class URLMock {
      static createObjectURL = vi.fn(() => "blob:test-image");
      static revokeObjectURL = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the whiteboard and its drawing tools", () => {
    render(<App />);

    expect(getCanvas()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eraser/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shape/i })).toBeInTheDocument();
  });

  it("adds a sticky note to the board", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    expect(getStickyNote("empty")).toBeInTheDocument();
  });

  it("edits sticky-note text", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote("empty");
    const textbox = within(note).getByRole("textbox");

    await user.clear(textbox);
    await user.type(textbox, "Project idea");

    expect(
      screen.getByRole("article", {
        name: "Sticky note: Project idea",
      }),
    ).toBeInTheDocument();
  });

  it("changes a sticky note's colour", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote("empty");
    const colourControl = within(note).getAllByRole("button", {
      name: /change note colour to/i,
    })[0];

    expect(colourControl).toBeDefined();

    await user.click(colourControl);

    expect(note).toBeInTheDocument();
  });

  it("deletes a sticky note", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    expect(getStickyNote("empty")).toBeInTheDocument();

    const note = getStickyNote("empty");
    await user.click(within(note).getByRole("button", { name: /delete/i }));

    expect(screen.queryByRole("article", { name: "Sticky note: empty" })).not.toBeInTheDocument();
  });

  it("restores sticky notes from local storage", () => {
    localStorage.setItem(
      NOTES_KEY,
      JSON.stringify([
        {
          id: "restored-note",
          x: 30,
          y: 40,
          text: "Restored idea",
          color: "#fff1a8",
        },
      ]),
    );

    render(<App />);

    expect(
      screen.getByRole("article", {
        name: "Sticky note: Restored idea",
      }),
    ).toBeInTheDocument();
  });

  it("moves a focused sticky note with the arrow keys", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote("empty");

    expect(note).toHaveStyle({ left: "24px", top: "24px" });

    note.focus();
    fireEvent.keyDown(note, { key: "ArrowRight" });
    fireEvent.keyDown(note, { key: "ArrowDown" });

    await waitFor(() => {
      expect(getStickyNote("empty")).toHaveStyle({
        left: "34px",
        top: "34px",
      });
    });
  });

  it("moves a sticky note by one pixel when Shift and an arrow key are pressed", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote("empty");

    expect(note).toHaveStyle({ left: "24px", top: "24px" });

    note.focus();
    fireEvent.keyDown(note, {
      key: "ArrowRight",
      shiftKey: true,
    });

    await waitFor(() => {
      expect(getStickyNote("empty")).toHaveStyle({
        left: "25px",
        top: "24px",
      });
    });
  });

  it("keeps a sticky note within the board boundaries", async () => {
    const user = userEvent.setup();

    render(<App />);
    mockBoardDimensions();

    await user.click(screen.getByRole("button", { name: /sticky note/i }));

    const note = getStickyNote("empty");
    note.focus();

    for (let index = 0; index < 60; index += 1) {
      fireEvent.keyDown(note, { key: "ArrowRight" });
      fireEvent.keyDown(note, { key: "ArrowDown" });
    }

    await waitFor(() => {
      expect(note).toHaveStyle({
        left: "280px",
        top: "210px",
      });
    });
  });

  it("draws on the canvas with pointer events", () => {
    render(<App />);

    const canvas = getCanvas();
    const context = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      lineCap: "round",
      lineJoin: "round",
    };

    vi.spyOn(canvas, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);

    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 30,
      clientY: 40,
      button: 0,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      clientX: 70,
      clientY: 80,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: 70,
      clientY: 80,
    });

    expect(JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]")).toHaveLength(1);
  });

  it("handles undo and redo keyboard shortcuts", () => {
    render(<App />);
    getCanvas();

    fireEvent.keyDown(window, {
      key: "z",
      ctrlKey: true,
    });

    fireEvent.keyDown(window, {
      key: "y",
      ctrlKey: true,
    });

    expect(getCanvas()).toBeInTheDocument();
  });

  it("ignores malformed saved sticky-note data", () => {
    localStorage.setItem(NOTES_KEY, "{invalid json");

    expect(() => render(<App />)).not.toThrow();
  });

  it("ignores malformed saved stroke data", () => {
    localStorage.setItem(STROKES_KEY, "{invalid json");

    expect(() => render(<App />)).not.toThrow();
  });

  it("exports the canvas as a PNG", async () => {
    const user = userEvent.setup();
    const originalCreateElement = document.createElement.bind(document);
    let exportCanvas: HTMLCanvasElement | null = null;

    const exportContext = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      scale: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      lineCap: "round",
      lineJoin: "round",
      globalCompositeOperation: "source-over",
      shadowColor: "",
      shadowBlur: 0,
      font: "",
      textBaseline: "top",
    };

    vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
      options?: ElementCreationOptions,
    ) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === "canvas") {
        exportCanvas = element as HTMLCanvasElement;

        vi.spyOn(exportCanvas, "getContext").mockReturnValue(
          exportContext as unknown as CanvasRenderingContext2D,
        );

        vi.spyOn(exportCanvas, "toBlob").mockImplementation((callback) => {
          callback(new Blob(["test"], { type: "image/png" }));
        });
      }

      return element;
    }) as typeof document.createElement);

    // Prevent jsdom from attempting to navigate when the download link is clicked.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<App />);
    getCanvas();

    await user.click(screen.getByRole("button", { name: /export png/i }));

    expect(exportCanvas).not.toBeNull();
    expect(exportCanvas?.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(exportContext.drawImage).toHaveBeenCalled();
  });
});
