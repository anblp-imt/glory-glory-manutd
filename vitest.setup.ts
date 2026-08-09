import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement scrollIntoView; Schedule's auto-scroll-to-today effect calls
// it unconditionally, which would otherwise throw "not implemented" in every test.
Element.prototype.scrollIntoView = vi.fn();

// jsdom doesn't implement matchMedia at all (it's undefined, not a stub) — default to
// "no preference" so any component checking prefers-reduced-motion doesn't throw.
// Tests that need to simulate the opposite use vi.spyOn(window, 'matchMedia').
window.matchMedia = window.matchMedia || (((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia);

// jsdom doesn't implement canvas 2D rendering — getContext('2d') returns null and logs
// "Not implemented" otherwise. Components that draw on a canvas (e.g. WinFireworks) only
// need getContext to return a truthy, method-shaped object in tests; the actual drawing
// is never asserted on (see WinFireworks.test.tsx for why).
HTMLCanvasElement.prototype.getContext = ((() => ({
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  setTransform: () => {},
  fillStyle: '',
  globalAlpha: 1,
})) as unknown) as typeof HTMLCanvasElement.prototype.getContext;
