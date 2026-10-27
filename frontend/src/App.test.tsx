import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const STROKES_KEY = "ai-whiteboard-strokes";
const NOTES_KEY = "ai-whiteboard-notes";

const CANVAS_LABEL = "Interactive whiteboard. Select a drawing tool and draw on the canvas.";

function getCanvas() {
  const canvas = screen.getByLabelText(CANVAS_LABEL);

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

function drawStroke(canvas: HTMLElement) {
  fireEvent.pointerDown(canvas, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 20,
    clientY: 30,
  });

  fireEvent.pointerMove(canvas, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 60,
    clientY: 90,
  });

  fireEvent.pointerUp(canvas, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 60,
    clientY: 90,
  });
}

describe("AI Whiteboard UI", () => {
  beforeEach(() => {
    localStorage.clear();

    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-whiteboard"),
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("initial rendering", () => {
    it("renders the main toolbar, drawing tools, and canvas", () => {
      render(<App />);

      expect(screen.getByRole("button", { name: "Export PNG" })).toBeInTheDocument();

      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();

      expect(screen.getByRole("button", { name: "Clear drawings" })).toBeDisabled();

      expect(screen.getByRole("button", { name: /sticky note/i })).toBeInTheDocument();

      expect(screen.getByRole("button", { name: "Pen" })).toHaveAttribute("aria-pressed", "true");

      expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      expect(screen.getByLabelText(CANVAS_LABEL)).toBeInTheDocument();
    });
  });

  describe("sticky notes", () => {
    it("creates a sticky note and persists it to local storage", async () => {
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole("button", { name: /sticky note/i }));

      expect(screen.getByRole("textbox", { name: "Sticky note text" })).toBeInTheDocument();

      await waitFor(() => {
        const savedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]");

        expect(savedNotes).toHaveLength(1);
        expect(savedNotes[0]).toMatchObject({
          text: "",
          color: "#fff1a8",
        });
        expect(savedNotes[0].id).toEqual(expect.any(String));
      });
    });

    it("edits a note and saves its text", async () => {
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole("button", { name: /sticky note/i }));

      const textarea = screen.getByRole("textbox", {
        name: "Sticky note text",
      });

      await user.type(textarea, "Plan the next feature");

      expect(textarea).toHaveValue("Plan the next feature");

      await waitFor(() => {
        const savedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]");

        expect(savedNotes[0].text).toBe("Plan the next feature");
      });
    });

    it("changes a note colour and persists the change", async () => {
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole("button", { name: /sticky note/i }));

      await user.click(
        screen.getByRole("button", {
          name: "Change note colour to #ffd8be",
        }),
      );

      expect(screen.getByRole("article", { name: "Sticky note" })).toHaveStyle({
        backgroundColor: "#ffd8be",
      });

      await waitFor(() => {
        const savedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]");

        expect(savedNotes[0].color).toBe("#ffd8be");
      });
    });

    it("deletes a note and updates local storage", async () => {
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole("button", { name: /sticky note/i }));

      expect(screen.getByRole("textbox", { name: "Sticky note text" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Delete sticky note" }));

      expect(screen.queryByRole("textbox", { name: "Sticky note text" })).not.toBeInTheDocument();

      await waitFor(() => {
        expect(localStorage.getItem(NOTES_KEY)).toBe("[]");
      });
    });

    it("restores saved notes when the app loads", () => {
      localStorage.setItem(
        NOTES_KEY,
        JSON.stringify([
          {
            id: "saved-note",
            text: "Restored idea",
            x: 40,
            y: 50,
            color: "#dbeafe",
          },
        ]),
      );

      render(<App />);

      expect(screen.getByRole("textbox", { name: "Sticky note text" })).toHaveValue(
        "Restored idea",
      );

      expect(screen.getByRole("article", { name: "Sticky note" })).toHaveStyle({
        left: "40px",
        top: "50px",
        backgroundColor: "#dbeafe",
      });
    });
  });

  describe("drawing interactions", () => {
    it("draws a stroke and persists its points", async () => {
      render(<App />);

      const canvas = getCanvas();
      drawStroke(canvas);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]");

        expect(saved).toHaveLength(1);
        expect(saved[0]).toMatchObject({
          tool: "pen",
          color: "#202124",
          size: 4,
          points: [
            { x: 20, y: 30 },
            { x: 60, y: 90 },
          ],
        });
      });

      expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();

      expect(screen.getByRole("button", { name: "Clear drawings" })).toBeEnabled();
    });

    it("undoes the most recent stroke", async () => {
      const user = userEvent.setup();

      render(<App />);

      drawStroke(getCanvas());

      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]")).toHaveLength(1);
      });

      await user.click(screen.getByRole("button", { name: /undo/i }));

      await waitFor(() => {
        expect(localStorage.getItem(STROKES_KEY)).toBe("[]");
      });

      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });

    it("clears all drawing strokes", async () => {
      const user = userEvent.setup();

      render(<App />);

      drawStroke(getCanvas());

      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]")).toHaveLength(1);
      });

      await user.click(screen.getByRole("button", { name: "Clear drawings" }));

      await waitFor(() => {
        expect(localStorage.getItem(STROKES_KEY)).toBe("[]");
      });

      expect(screen.getByRole("button", { name: "Clear drawings" })).toBeDisabled();
    });

    it("moves a selected stroke and persists its new coordinates", async () => {
      const user = userEvent.setup();

      render(<App />);

      const canvas = getCanvas();
      drawStroke(canvas);

      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]")).toHaveLength(1);
      });

      await user.click(screen.getByRole("button", { name: "Select" }));

      fireEvent.pointerDown(canvas, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        clientX: 20,
        clientY: 30,
      });

      fireEvent.pointerMove(canvas, {
        pointerId: 2,
        pointerType: "mouse",
        clientX: 40,
        clientY: 50,
      });

      fireEvent.pointerUp(canvas, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        clientX: 40,
        clientY: 50,
      });

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]");

        expect(saved[0].points).toEqual([
          { x: 40, y: 50 },
          { x: 80, y: 110 },
        ]);
      });
    });

    it("deletes a selected stroke with the Delete key", async () => {
      const user = userEvent.setup();

      render(<App />);

      const canvas = getCanvas();
      drawStroke(canvas);

      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STROKES_KEY) ?? "[]")).toHaveLength(1);
      });

      await user.click(screen.getByRole("button", { name: "Select" }));

      fireEvent.pointerDown(canvas, {
        pointerId: 3,
        pointerType: "mouse",
        button: 0,
        clientX: 20,
        clientY: 30,
      });

      fireEvent.pointerUp(canvas, {
        pointerId: 3,
        pointerType: "mouse",
        button: 0,
        clientX: 20,
        clientY: 30,
      });

      await user.keyboard("{Delete}");

      await waitFor(() => {
        expect(localStorage.getItem(STROKES_KEY)).toBe("[]");
      });
    });
  });

  describe("drawing tools and keyboard shortcuts", () => {
    it("creates a sticky note with the N keyboard shortcut", () => {
      render(<App />);

      fireEvent.keyDown(window, { key: "n" });

      expect(screen.getByRole("textbox", { name: "Sticky note text" })).toBeInTheDocument();
    });

    it("switches between the eraser and pen with keyboard shortcuts", () => {
      render(<App />);

      fireEvent.keyDown(window, { key: "e" });

      expect(screen.getByRole("button", { name: "Eraser" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      fireEvent.keyDown(window, { key: "p" });

      expect(screen.getByRole("button", { name: "Pen" })).toHaveAttribute("aria-pressed", "true");
    });

    it("does not trigger keyboard shortcuts while typing in a note", async () => {
      const user = userEvent.setup();

      render(<App />);

      await user.click(screen.getByRole("button", { name: /sticky note/i }));

      const textarea = screen.getByRole("textbox", {
        name: "Sticky note text",
      });

      await user.type(textarea, "p");

      expect(screen.getByRole("button", { name: "Pen" })).toHaveAttribute("aria-pressed", "true");

      expect(textarea).toHaveValue("p");
    });

    it("ignores malformed saved data without crashing", () => {
      localStorage.setItem(STROKES_KEY, "{invalid json");
      localStorage.setItem(NOTES_KEY, "{invalid json");

      render(<App />);

      expect(screen.getByRole("button", { name: "Export PNG" })).toBeInTheDocument();

      expect(screen.getByText(/0 strokes · 0 notes/)).toBeInTheDocument();
    });
  });

  describe("PNG export", () => {
    it("creates a PNG blob and starts a download", async () => {
      const user = userEvent.setup();

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      render(<App />);

      await user.click(screen.getByRole("button", { name: "Export PNG" }));

      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

      expect(clickSpy).toHaveBeenCalled();

      const downloadLink = clickSpy.mock.instances[0] as HTMLAnchorElement | undefined;

      expect(downloadLink?.download).toBe("ai-whiteboard.png");
    });
  });
});
