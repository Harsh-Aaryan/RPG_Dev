import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { force2DFromUrl, hasWebGL } from '../../lib/webgl';
import { Boss2D } from './Boss2D';
import type { BossSceneProps } from './BossScene';

// three.js + R3F live in their own chunk; pages render the SVG poster until it arrives.
const BossScene = lazy(() => import('./BossScene'));

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The arena: lazy 3D scene with a hand-drawn 2D fallback, atmospheric vignette,
 * and rendering paused while scrolled out of view.
 */
export function ArenaView(props: BossSceneProps & { children?: ReactNode }) {
  const { children, ...scene } = props;
  const use3D = useMemo(() => hasWebGL() && !force2DFromUrl(), []);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const poster = (
    <div className="absolute inset-x-0 bottom-0" style={{ top: `${(scene.hudInset ?? 0) * 100}%` }}>
      <Boss2D severity={scene.severity} form={scene.form} hpRatio={scene.hpRatio} defeated={scene.defeated} reducedMotion={scene.reducedMotion} />
    </div>
  );

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden bg-night">
      {use3D ? (
        <SceneBoundary fallback={poster}>
          <Suspense fallback={poster}>
            <BossScene {...scene} paused={!visible} />
          </Suspense>
        </SceneBoundary>
      ) : (
        poster
      )}
      {/* vignette + floor haze */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 38%, transparent 52%, rgb(8 11 9 / 0.78) 100%), linear-gradient(180deg, rgb(18 23 20 / 0.55) 0%, transparent 22%, transparent 78%, rgb(12 16 14 / 0.6) 100%)',
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}
