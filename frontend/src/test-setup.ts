import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock;

const context2D = {
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  arc: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  globalCompositeOperation: "source-over",
  lineWidth: 1,
  lineCap: "round",
  lineJoin: "round",
  strokeStyle: "#000000",
  fillStyle: "#000000",
  font: "12px sans-serif",
  textBaseline: "top",
  shadowColor: "transparent",
  shadowBlur: 0,
};

HTMLCanvasElement.prototype.getContext = vi.fn(
  () => context2D,
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,dGVzdA==");

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(["test"], { type: "image/png" }));
});
