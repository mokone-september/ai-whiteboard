import { useEffect, useRef, useState } from "react";
import type { PointerEvent, CSSProperties } from "react";
import "./App.css";

type Tool = "pen" | "eraser" | "rectangle";

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
};

const COLORS = ["#202124", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#9333ea"];

const STORAGE_KEY = "ai-whiteboard-strokes";

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

    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
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

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(loadStrokes);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

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

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const stroke: Stroke = {
      tool,
      color,
      size,
      points: [getPoint(event)],
    };

    activeStrokeRef.current = stroke;
    setIsDrawing(true);

    const canvas = canvasRef.current;

    if (canvas) {
      renderCanvas(canvas, strokesRef.current, stroke);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;

    activeStroke.points.push(getPoint(event));

    const canvas = canvasRef.current;

    if (canvas) {
      renderCanvas(canvas, strokesRef.current, activeStroke);
    }
  }

  function finishDrawing() {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;

    const nextStrokes = [...strokesRef.current, activeStroke];

    strokesRef.current = nextStrokes;
    activeStrokeRef.current = null;
    setStrokes(nextStrokes);
    setIsDrawing(false);
  }

  function undo() {
    const nextStrokes = strokesRef.current.slice(0, -1);

    strokesRef.current = nextStrokes;
    activeStrokeRef.current = null;
    setStrokes(nextStrokes);
    setIsDrawing(false);
  }

  function clearCanvas() {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setStrokes([]);
    setIsDrawing(false);
  }

  function selectTool(nextTool: Tool) {
    activeStrokeRef.current = null;
    setIsDrawing(false);
    setTool(nextTool);

    const canvas = canvasRef.current;

    if (canvas) {
      renderCanvas(canvas, strokesRef.current, null);
    }
  }

  function exportPng() {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;

    // Export a white background so the PNG looks good in image viewers.
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

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

      URL.revokeObjectURL(url);
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
            title="Undo last stroke"
          >
            ↶ Undo
          </button>

          <button
            className="button button-danger"
            type="button"
            onClick={clearCanvas}
            disabled={strokes.length === 0}
          >
            Clear
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Whiteboard workspace">
        <aside className="tool-panel" aria-label="Drawing tools">
          <p className="panel-label">TOOLS</p>

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
                onClick={() => setColor(swatch)}
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
              <p>Ideas start with a single stroke.</p>
            </div>
            <span className="canvas-hint">Freeform canvas</span>
          </div>

          <div className="canvas-shell">
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              aria-label="Interactive whiteboard. Select a tool and draw on the canvas."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            />

            {strokes.length === 0 && !isDrawing && (
              <div className="canvas-empty" aria-hidden="true">
                <span className="empty-icon">✳</span>
                <p>Start sketching your ideas</p>
                <span>Select the pen and draw anywhere on the canvas</span>
              </div>
            )}
          </div>

          <footer className="canvas-footer">
            <span>
              <span className="footer-dot" />
              {strokes.length} {strokes.length === 1 ? "stroke" : "strokes"}
            </span>
            <span>Drawings are saved in this browser</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default App;
