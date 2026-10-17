let cached: boolean | null = null;

export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    cached = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

/** `?2d=1` forces the SVG arena (handy for slow laptops and screenshots). */
export function force2DFromUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('2d') === '1';
  } catch {
    return false;
  }
}
