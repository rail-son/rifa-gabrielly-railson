import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Fotos ─────────────────────────────────────────────────────────────────
const ALL_PHOTOS = Array.from({ length: 10 }, (_, i) => `/public/stories/${i + 1}.JPEG`);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embaralha uma vez por carregamento de página
const STORY_PHOTOS = shuffle(ALL_PHOTOS);
const DURATION = 5000;

// ─── Story Viewer ──────────────────────────────────────────────────────────
function StoryViewer({ onClose }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const [pct, setPct]         = useState(0);
  const elapsed   = useRef(0);
  const startedAt = useRef(Date.now());
  const raf       = useRef(null);
  const touchX    = useRef(null);
  const touchY    = useRef(null);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goNext = useCallback(() => {
    if (current < STORY_PHOTOS.length - 1) {
      elapsed.current = 0;
      setPct(0);
      setCurrent(c => c + 1);
    } else {
      onClose();
    }
  }, [current, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      elapsed.current = 0;
      setPct(0);
      setCurrent(c => c - 1);
    }
  }, [current]);

  // Animation loop
  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(raf.current);
      return;
    }
    startedAt.current = Date.now() - elapsed.current;

    const tick = () => {
      const now = Date.now() - startedAt.current;
      elapsed.current = now;
      const p = Math.min((now / DURATION) * 100, 100);
      setPct(p);
      if (now >= DURATION) {
        goNext();
      } else {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [current, paused, goNext]);

  // Keyboard
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') setPaused(p => !p);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [goNext, goPrev, onClose]);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchX.current = null;
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) { onClose(); return; }
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── HEADER — always on top, z-index alto ── */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        {/* Progress bars */}
        <div style={{
          display: 'flex', gap: 3,
          padding: '12px 12px 6px',
        }}>
          {STORY_PHOTOS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2.5, borderRadius: 2,
              background: 'rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: '#fff',
                width: i < current ? '100%' : i === current ? `${pct}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* Title row with buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 12px 10px',
        }}>
          {/* Mini avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.8)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <img src="/FOTO_DO_CASAL.jpeg" alt="casal"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Name */}
          <div style={{ flex: 1 }}>
            <p style={{
              color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'Lato, sans-serif', margin: 0,
            }}>
              Gabrielly & Railson
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 11,
              fontFamily: 'Lato, sans-serif', margin: 0,
            }}>
              {current + 1} / {STORY_PHOTOS.length}
            </p>
          </div>

          {/* Pause button */}
          <button
            onClick={(e) => { e.stopPropagation(); setPaused(p => !p); }}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none', borderRadius: '50%',
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontSize: 13,
              flexShrink: 0,
            }}
          >
            {paused ? '▶' : '⏸'}
          </button>

          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none', borderRadius: '50%',
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontSize: 18,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── PHOTO AREA + tap zones ── */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {/* Photo */}
        <img
          key={current}
          src={STORY_PHOTOS[current]}
          alt={`Foto ${current + 1}`}
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            display: 'block',
            animation: 'storyIn 0.18s ease-out',
          }}
        />

        {/* Tap left → prev */}
        <div
          onClick={goPrev}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%',
            cursor: 'w-resize',
            zIndex: 2,
          }}
        />

        {/* Tap right → next */}
        <div
          onClick={goNext}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%',
            cursor: 'e-resize',
            zIndex: 2,
          }}
        />
      </div>

      <style>{`
        @keyframes storyIn {
          from { opacity: 0.5; transform: scale(1.03); }
          to   { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Story Avatar ──────────────────────────────────────────────────────────
export default function StoryAvatar({ size = 180 }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          width: size, height: size,
          borderRadius: '50%',
          padding: 3,
          background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
          boxShadow: '0 4px 20px rgba(220,39,67,0.35)',
          cursor: 'pointer',
          border: 'none', outline: 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.04)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(220,39,67,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,39,67,0.35)';
        }}
        aria-label="Ver fotos do casal"
      >
        {/* White gap (Instagram style) */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: '50%', padding: 3,
          background: '#f5f0e8',
          overflow: 'hidden',
        }}>
          <img
            src="/FOTO_DO_CASAL.jpeg"
            alt="Gabrielly e Railson"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none', width: '100%', height: '100%',
            borderRadius: '50%', background: '#5c6b4a',
            alignItems: 'center', justifyContent: 'center', fontSize: 48,
          }}>💑</div>
        </div>

        {/* Label */}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(45deg, #f09433, #dc2743)',
          color: '#fff', fontSize: 10, fontWeight: 700,
          fontFamily: 'Lato, sans-serif',
          padding: '2px 8px', borderRadius: 10,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          ♥ ver fotos
        </div>
      </button>

      {open && <StoryViewer onClose={() => setOpen(false)} />}
    </>
  );
}
