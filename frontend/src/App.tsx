import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import "./App.css";

type Tool = "select" | "pen" | "eraser" | "rectangle";

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  tool: Exclude<Tool, "select">;
  color: string;
  size: number;
  points: Point[];
};

type StickyNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

type NoteDrag = {
  id: string;
  offsetX: number;
  offsetY: number;
};

type StrokeDrag = {
  index: number;
  lastPoint: Point;
};

const COLORS = ["#202124", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#9333ea"];
const NOTE_COLORS = ["#fff1a8", "#ffd8be", "#d8f5d0", "#dbeafe", "#f3d9fa"];

const STORAGE_KEY = "ai-whiteboard-strokes";
const NOTE_STORAGE_KEY = "ai-whiteboard-notes";
const NOTE_WIDTH = 220;
const NOTE_HEIGHT = 190;

function isValidStroke(value: unknown): value is Stroke {
  if (typeof value !== "object" || value === null) return false;

  const stroke = value as Partial<Stroke>;

  if (stroke.tool !== "pen" && stroke.tool !== "eraser" && stroke.tool !== "rectangle") {
    return false;
  }

  if (
    typeof stroke.color !== "string" ||
    typeof stroke.size !== "number" ||
    !Number.isFinite(stroke.size) ||
    stroke.size <= 0 ||
    !Array.isArray(stroke.points)
  ) {
    return false;
  }

  return stroke.points.every(
    (point: unknown) =>
      typeof point === "object" &&
      point !== null &&
      "x" in point &&
      "y" in point &&
      typeof point.x === "number" &&
      Number.isFinite(point.x) &&
      typeof point.y === "number" &&
      Number.isFinite(point.y),
  );
}

function loadStrokes(): Stroke[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidStroke) : [];
  } catch {
    return [];
  }
}

function isValidStickyNote(value: unknown): value is StickyNote {
  if (typeof value !== "object" || value === null) return false;

  const note = value as Partial<StickyNote>;

  return (
    typeof note.id === "string" &&
    typeof note.text === "string" &&
    typeof note.x === "number" &&
    Number.isFinite(note.x) &&
    typeof note.y === "number" &&
    Number.isFinite(note.y) &&
    typeof note.color === "string" &&
    NOTE_COLORS.includes(note.color)
  );
}

function loadStickyNotes(): StickyNote[] {
  try {
    const saved = localStorage.getItem(NOTE_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidStickyNote) : [];
  } catch {
    return [];
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { points, color, size, tool } = stroke;

  if (points.length === 0) return;

  ctx.save();
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }

  if (tool === "rectangle" && points.length >= 2) {
    const start = points[0];
    const end = points[points.length - 1];

    if (start && end) {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    }
  } else {
    const first = points[0];
    if (!first) {
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    if (points.length === 1) {
      ctx.arc(first.x, first.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        if (point) ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    }
  }

  ctx.restore();
}

function renderCanvas(canvas: HTMLCanvasElement, strokes: Stroke[], activeStroke: Stroke | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  strokes.forEach((stroke) => drawStroke(ctx, stroke));

  if (activeStroke) {
    drawStroke(ctx, activeStroke);
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    if (words.length === 0) {
      currentY += lineHeight;
      continue;
    }

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (line && ctx.measureText(candidate).width > maxWidth) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
        );

  const nearestX = start.x + projection * dx;
  const nearestY = start.y + projection * dy;

  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const noteDragRef = useRef<NoteDrag | null>(null);
  const strokeDragRef = useRef<StrokeDrag | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(loadStrokes);
  const [notes, setNotes] = useState<StickyNote[]>(loadStickyNotes);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState<number | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      renderCanvas(canvas, strokesRef.current, activeStrokeRef.current);
    });

    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      renderCanvas(canvas, strokes, activeStrokeRef.current);
    }
  }, [strokes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strokes));
    } catch (error) {
      console.error("Unable to save whiteboard locally:", error);
    }
  }, [strokes]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error("Unable to save sticky notes locally:", error);
    }
  }, [notes]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function findStrokeAtPoint(point: Point): number | null {
    for (let index = strokesRef.current.length - 1; index >= 0; index -= 1) {
      const stroke = strokesRef.current[index];
      if (!stroke || stroke.tool === "eraser" || stroke.points.length === 0) {
        continue;
      }

      const tolerance = Math.max(8, stroke.size + 4);

      if (stroke.tool === "rectangle" && stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        if (!start || !end) continue;

        const left = Math.min(start.x, end.x) - tolerance;
        const right = Math.max(start.x, end.x) + tolerance;
        const top = Math.min(start.y, end.y) - tolerance;
        const bottom = Math.max(start.y, end.y) + tolerance;

        const nearHorizontalEdge =
          point.x >= left &&
          point.x <= right &&
          (Math.abs(point.y - start.y) <= tolerance || Math.abs(point.y - end.y) <= tolerance);

        const nearVerticalEdge =
          point.y >= top &&
          point.y <= bottom &&
          (Math.abs(point.x - start.x) <= tolerance || Math.abs(point.x - end.x) <= tolerance);

        if (nearHorizontalEdge || nearVerticalEdge) return index;
        continue;
      }

      for (let pointIndex = 0; pointIndex < stroke.points.length; pointIndex += 1) {
        const current = stroke.points[pointIndex];
        if (!current) continue;

        const previous = pointIndex > 0 ? stroke.points[pointIndex - 1] : current;
        if (!previous) continue;

        if (distanceToSegment(point, previous, current) <= tolerance) {
          return index;
        }
      }
    }

    return null;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    const point = getPoint(event);

    if (tool === "select") {
      const index = findStrokeAtPoint(point);

      setSelectedNoteId(null);
      setSelectedStrokeIndex(index);
      strokeDragRef.current = null;

      if (index !== null) {
        event.currentTarget.setPointerCapture(event.pointerId);
        strokeDragRef.current = { index, lastPoint: point };
      }

      return;
    }

    setSelectedStrokeIndex(null);
    setSelectedNoteId(null);
    event.currentTarget.setPointerCapture(event.pointerId);

    const stroke: Stroke = {
      tool,
      color,
      size,
      points: [point],
    };

    activeStrokeRef.current = stroke;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (canvas) renderCanvas(canvas, strokesRef.current, stroke);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const strokeDrag = strokeDragRef.current;

    if (tool === "select" && strokeDrag) {
      const point = getPoint(event);
      const deltaX = point.x - strokeDrag.lastPoint.x;
      const deltaY = point.y - strokeDrag.lastPoint.y;

      if (deltaX === 0 && deltaY === 0) return;

      const nextStrokes = strokesRef.current.map((stroke, index) =>
        index === strokeDrag.index
          ? {
              ...stroke,
              points: stroke.points.map((item) => ({
                x: item.x + deltaX,
                y: item.y + deltaY,
              })),
            }
          : stroke,
      );

      strokesRef.current = nextStrokes;
      strokeDragRef.current = { ...strokeDrag, lastPoint: point };
      setStrokes(nextStrokes);
      return;
    }

    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;

    activeStroke.points.push(getPoint(event));

    const canvas = canvasRef.current;
    if (canvas) renderCanvas(canvas, strokesRef.current, activeStroke);
  }

  function finishDrawing() {
    if (strokeDragRef.current) {
      strokeDragRef.current = null;
      return;
    }

    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;

    const nextStrokes = [...strokesRef.current, activeStroke];

    strokesRef.current = nextStrokes;
    redoStackRef.current = [];
    activeStrokeRef.current = null;
    setStrokes(nextStrokes);
    setIsDrawing(false);
  }

  const undo = useCallback(() => {
    const currentStrokes = strokesRef.current;
    if (currentStrokes.length === 0) return;

    const removedStroke = currentStrokes[currentStrokes.length - 1];
    if (!removedStroke) return;

    redoStackRef.current = [...redoStackRef.current, removedStroke];
    const nextStrokes = currentStrokes.slice(0, -1);

    strokesRef.current = nextStrokes;
    activeStrokeRef.current = null;
    strokeDragRef.current = null;

    setStrokes(nextStrokes);
    setSelectedStrokeIndex(null);
    setIsDrawing(false);
  }, []);

  const redo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;

    const restoredStroke = redoStack[redoStack.length - 1];
    if (!restoredStroke) return;

    redoStackRef.current = redoStack.slice(0, -1);
    const nextStrokes = [...strokesRef.current, restoredStroke];
    strokesRef.current = nextStrokes;
    activeStrokeRef.current = null;
    strokeDragRef.current = null;

    setStrokes(nextStrokes);
    setSelectedStrokeIndex(null);
    setIsDrawing(false);
  }, []);

  function clearCanvas() {
    redoStackRef.current = [];
    strokesRef.current = [];
    activeStrokeRef.current = null;
    strokeDragRef.current = null;
    setStrokes([]);
    setSelectedStrokeIndex(null);
    setIsDrawing(false);
  }

  const selectTool = useCallback((nextTool: Tool) => {
    activeStrokeRef.current = null;
    strokeDragRef.current = null;
    setIsDrawing(false);
    setTool(nextTool);

    if (nextTool !== "select") {
      setSelectedStrokeIndex(null);
      setSelectedNoteId(null);
    }

    const canvas = canvasRef.current;
    if (canvas) renderCanvas(canvas, strokesRef.current, null);
  }, []);

  const addStickyNote = useCallback(() => {
    const shell = canvasShellRef.current;
    if (!shell) return;

    const offset = (notes.length % 5) * 24;
    const maxX = Math.max(0, shell.clientWidth - NOTE_WIDTH);
    const maxY = Math.max(0, shell.clientHeight - NOTE_HEIGHT);

    const note: StickyNote = {
      id: crypto.randomUUID(),
      text: "",
      x: Math.min(24 + offset, maxX),
      y: Math.min(24 + offset, maxY),
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length] ?? NOTE_COLORS[0],
    };

    setNotes((current) => [...current, note]);
    setSelectedStrokeIndex(null);
    setSelectedNoteId(note.id);
  }, [notes.length]);

  function updateStickyNote(id: string, text: string) {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, text } : note)));
  }

  function changeNoteColor(id: string, nextColor: string) {
    if (!NOTE_COLORS.includes(nextColor)) return;

    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, color: nextColor } : note)),
    );
  }

  const deleteStickyNote = useCallback((id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
    setSelectedNoteId((current) => (current === id ? null : current));
    noteDragRef.current = null;
  }, []);

  function startNoteDrag(event: PointerEvent<HTMLDivElement>, note: StickyNote) {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    if ((event.target as HTMLElement).closest("button")) return;

    event.preventDefault();
    event.stopPropagation();

    setSelectedNoteId(note.id);
    setSelectedStrokeIndex(null);

    const shell = canvasShellRef.current;
    if (!shell) return;

    const rect = shell.getBoundingClientRect();
    noteDragRef.current = {
      id: note.id,
      offsetX: event.clientX - rect.left - note.x,
      offsetY: event.clientY - rect.top - note.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleNoteKeyDown(event: KeyboardEvent<HTMLElement>, note: StickyNote) {
    // Don't intercept keyboard input from the textarea or note buttons.
    if (event.target !== event.currentTarget) return;

    let deltaX = 0;
    let deltaY = 0;

    switch (event.key) {
      case "ArrowLeft":
        deltaX = -1;
        break;
      case "ArrowRight":
        deltaX = 1;
        break;
      case "ArrowUp":
        deltaY = -1;
        break;
      case "ArrowDown":
        deltaY = 1;
        break;
      default:
        return;
    }

    const shell = canvasShellRef.current;
    if (!shell) return;

    event.preventDefault();

    const step = event.shiftKey ? 1 : 10;
    const maxX = Math.max(0, shell.clientWidth - NOTE_WIDTH);
    const maxY = Math.max(0, shell.clientHeight - NOTE_HEIGHT);

    setNotes((current) =>
      current.map((currentNote) =>
        currentNote.id === note.id
          ? {
              ...currentNote,
              x: Math.min(Math.max(0, currentNote.x + deltaX * step), maxX),
              y: Math.min(Math.max(0, currentNote.y + deltaY * step), maxY),
            }
          : currentNote,
      ),
    );

    setSelectedNoteId(note.id);
    setSelectedStrokeIndex(null);
  }

  function handleNoteDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = noteDragRef.current;
    const shell = canvasShellRef.current;

    if (!drag || !shell) return;

    const rect = shell.getBoundingClientRect();
    const maxX = Math.max(0, shell.clientWidth - NOTE_WIDTH);
    const maxY = Math.max(0, shell.clientHeight - NOTE_HEIGHT);

    const x = Math.min(Math.max(0, event.clientX - rect.left - drag.offsetX), maxX);
    const y = Math.min(Math.max(0, event.clientY - rect.top - drag.offsetY), maxY);

    setNotes((current) => current.map((note) => (note.id === drag.id ? { ...note, x, y } : note)));
  }

  function finishNoteDrag() {
    noteDragRef.current = null;
  }

  function recolorSelectedStroke(nextColor: string) {
    if (selectedStrokeIndex === null) return;

    const nextStrokes = strokesRef.current.map((stroke, index) =>
      index === selectedStrokeIndex ? { ...stroke, color: nextColor } : stroke,
    );

    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }

  const deleteSelectedObject = useCallback(() => {
    if (selectedStrokeIndex !== null) {
      const nextStrokes = strokesRef.current.filter((_, index) => index !== selectedStrokeIndex);

      strokesRef.current = nextStrokes;
      setStrokes(nextStrokes);
      setSelectedStrokeIndex(null);
      strokeDragRef.current = null;
      return;
    }

    if (selectedNoteId !== null) {
      deleteStickyNote(selectedNoteId);
    }
  }, [selectedStrokeIndex, selectedNoteId, deleteStickyNote]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (modifier && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (modifier && key === "s") {
        event.preventDefault();
        return;
      }

      if (event.key === "Escape") {
        setSelectedStrokeIndex(null);
        setSelectedNoteId(null);
        strokeDragRef.current = null;
        noteDragRef.current = null;
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedStrokeIndex !== null || selectedNoteId !== null) {
          event.preventDefault();
          deleteSelectedObject();
        }
        return;
      }

      if (modifier || event.altKey) return;

      switch (key) {
        case "v":
          selectTool("select");
          break;
        case "p":
          selectTool("pen");
          break;
        case "e":
          selectTool("eraser");
          break;
        case "r":
          selectTool("rectangle");
          break;
        case "n":
          addStickyNote();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    addStickyNote,
    deleteSelectedObject,
    selectedStrokeIndex,
    selectedNoteId,
    selectTool,
    undo,
    redo,
  ]);

  function handleColorSelect(swatch: string) {
    setColor(swatch);

    if (selectedStrokeIndex !== null) {
      recolorSelectedStroke(swatch);
    }
  }

  function exportPng() {
    const sourceCanvas = canvasRef.current;
    const shell = canvasShellRef.current;

    if (!sourceCanvas || !shell) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const scaleX = exportCanvas.width / Math.max(1, shell.clientWidth);
    const scaleY = exportCanvas.height / Math.max(1, shell.clientHeight);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    notes.forEach((note) => {
      const x = note.x * scaleX;
      const y = note.y * scaleY;
      const width = NOTE_WIDTH * scaleX;
      const height = NOTE_HEIGHT * scaleY;

      ctx.save();
      ctx.fillStyle = note.color;
      ctx.shadowColor = "rgba(25, 30, 45, 0.14)";
      ctx.shadowBlur = 10 * scaleX;
      ctx.fillRect(x, y, width, height);
      ctx.shadowColor = "transparent";

      ctx.fillStyle = "#343434";
      ctx.font = `${12 * scaleX}px sans-serif`;
      ctx.textBaseline = "top";
      drawWrappedText(
        ctx,
        note.text || " ",
        x + 14 * scaleX,
        y + 42 * scaleY,
        width - 28 * scaleX,
        18 * scaleY,
      );
      ctx.restore();
    });

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        console.error("Unable to export the whiteboard as PNG.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "ai-whiteboard.png";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <main className="whiteboard-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AI Whiteboard home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>
            canvas<span className="brand-muted">.ai</span>
          </span>
        </a>

        <div className="board-title">
          <span className="status-dot" />
          <span>Untitled board</span>
          <span className="draft-label">Local draft</span>
        </div>

        <div className="topbar-actions">
          <span className="board-status">Auto-saved locally</span>

          <button className="button button-secondary" type="button" onClick={exportPng}>
            Export PNG
          </button>

          <button
            className="button button-secondary"
            type="button"
            onClick={undo}
            disabled={strokes.length === 0}
            title="Undo last drawing stroke"
          >
            ↶ Undo
          </button>

          <button
            className="button button-danger"
            type="button"
            onClick={deleteSelectedObject}
            disabled={selectedStrokeIndex === null && selectedNoteId === null}
            title="Delete selected drawing or sticky note"
          >
            Delete selected
          </button>

          <button
            className="button button-danger"
            type="button"
            onClick={clearCanvas}
            disabled={strokes.length === 0}
          >
            Clear drawings
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Whiteboard workspace">
        <aside className="tool-panel" aria-label="Drawing tools">
          <p className="panel-label">TOOLS</p>

          <button
            type="button"
            className="tool-button"
            onClick={addStickyNote}
            title="Create a sticky note"
          >
            <span aria-hidden="true">▤</span>
            <span>Sticky note</span>
          </button>

          <button
            type="button"
            className={`tool-button ${tool === "select" ? "active" : ""}`}
            onClick={() => selectTool("select")}
            aria-pressed={tool === "select"}
            title="Select and move drawings"
          >
            <span aria-hidden="true">↖</span>
            <span>Select</span>
          </button>

          <button
            type="button"
            className={`tool-button ${tool === "pen" ? "active" : ""}`}
            onClick={() => selectTool("pen")}
            aria-pressed={tool === "pen"}
            title="Pen"
          >
            <span aria-hidden="true">✎</span>
            <span>Pen</span>
          </button>

          <button
            type="button"
            className={`tool-button ${tool === "rectangle" ? "active" : ""}`}
            onClick={() => selectTool("rectangle")}
            aria-pressed={tool === "rectangle"}
            title="Rectangle"
          >
            <span aria-hidden="true">▱</span>
            <span>Shape</span>
          </button>

          <button
            type="button"
            className={`tool-button ${tool === "eraser" ? "active" : ""}`}
            onClick={() => selectTool("eraser")}
            aria-pressed={tool === "eraser"}
            title="Eraser"
          >
            <span aria-hidden="true">▰</span>
            <span>Eraser</span>
          </button>

          <div className="panel-divider" />

          <p className="panel-label">COLOR</p>
          <div className="color-grid">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`color-swatch ${color === swatch ? "selected" : ""}`}
                style={{ "--swatch-color": swatch } as CSSProperties}
                onClick={() => handleColorSelect(swatch)}
                aria-label={`Select ${swatch} color`}
                aria-pressed={color === swatch}
              />
            ))}
          </div>

          <div className="panel-divider" />

          <label className="size-control" htmlFor="stroke-size">
            <span className="panel-label">STROKE</span>
            <span className="size-value">{size}px</span>
            <input
              id="stroke-size"
              type="range"
              min="1"
              max="20"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
            <span className="size-preview">
              <span
                style={{
                  width: size,
                  height: size,
                  minWidth: size,
                  minHeight: size,
                }}
              />
            </span>
          </label>
        </aside>

        <div className="canvas-area">
          <div className="canvas-heading">
            <div>
              <h1>Your whiteboard</h1>
              <p>Sketch ideas and organise them with sticky notes.</p>
            </div>
            <span className="canvas-hint">Freeform canvas</span>
          </div>

          <div className="canvas-shell" ref={canvasShellRef}>
            <canvas
              ref={canvasRef}
              className={`drawing-canvas ${tool === "select" ? "select-mode" : ""}`}
              aria-label="Interactive whiteboard. Select a drawing tool and draw on the canvas."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            />

            {notes.map((note) => (
              <article
                key={note.id}
                tabIndex={0}
                className={`sticky-note ${selectedNoteId === note.id ? "selected" : ""}`}
                style={
                  {
                    left: note.x,
                    top: note.y,
                    backgroundColor: note.color,
                  } as CSSProperties
                }
                onFocus={() => {
                  setSelectedNoteId(note.id);
                  setSelectedStrokeIndex(null);
                }}
                onKeyDown={(event) => handleNoteKeyDown(event, note)}
                onPointerDown={(event) => {
                  if (tool === "select" && event.target === event.currentTarget) {
                    setSelectedNoteId(note.id);
                    setSelectedStrokeIndex(null);
                  }
                }}
                aria-label={`Sticky note: ${note.text.trim() || "empty"}`}
              >
                <div
                  className="sticky-note-header"
                  onPointerDown={(event) => startNoteDrag(event, note)}
                  onPointerMove={handleNoteDrag}
                  onPointerUp={finishNoteDrag}
                  onPointerCancel={finishNoteDrag}
                  title="Drag to move this note"
                >
                  <span className="sticky-note-grip" aria-hidden="true">
                    ⠿
                  </span>
                  <span className="sticky-note-title">NOTE</span>
                  <button
                    type="button"
                    className="sticky-note-delete"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => deleteStickyNote(note.id)}
                    aria-label="Delete sticky note"
                    title="Delete note"
                  >
                    ×
                  </button>
                </div>

                <textarea
                  className="sticky-note-text"
                  value={note.text}
                  onChange={(event) => updateStickyNote(note.id, event.target.value)}
                  onFocus={() => {
                    setSelectedNoteId(note.id);
                    setSelectedStrokeIndex(null);
                  }}
                  placeholder="Write your idea..."
                  aria-label="Sticky note text"
                  spellCheck
                />

                <div className="sticky-note-colors" aria-label="Sticky note colours">
                  {NOTE_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={`sticky-note-color ${note.color === swatch ? "selected" : ""}`}
                      style={{ "--note-color": swatch } as CSSProperties}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        changeNoteColor(note.id, swatch);
                        setSelectedNoteId(note.id);
                        setSelectedStrokeIndex(null);
                      }}
                      aria-label={`Change note colour to ${swatch}`}
                      aria-pressed={note.color === swatch}
                    />
                  ))}
                </div>
              </article>
            ))}

            {strokes.length === 0 && notes.length === 0 && !isDrawing && (
              <div className="canvas-empty" aria-hidden="true">
                <span className="empty-icon">✳</span>
                <p>Start sketching your ideas</p>
                <span>Select the pen to draw, or create a sticky note to write an idea.</span>
              </div>
            )}
          </div>

          <footer className="canvas-footer">
            <span>
              <span className="footer-dot" />
              {strokes.length} {strokes.length === 1 ? "stroke" : "strokes"}
              {" · "}
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
            <span>Drawings and notes are saved in this browser</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default App;
