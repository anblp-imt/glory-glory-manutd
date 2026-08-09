import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { WinFireworks } from './WinFireworks';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WinFireworks', () => {
  it('renders a canvas overlay when motion is not reduced', () => {
    const { container } = render(<WinFireworks />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders nothing when the viewer prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<WinFireworks />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('cancels its pending animation frame on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<WinFireworks />);
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
