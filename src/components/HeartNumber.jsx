import { useState } from 'react';

/**
 * Heart-shaped number button with three visual states:
 * - available (moss green): selectable
 * - selected (gold): user has chosen this number
 * - reserved (amber): blocked, awaiting payment
 * - paid (charcoal + red X): sold
 */
export default function HeartNumber({ number, status, selected, onClick }) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (status !== 'available') return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    onClick(number);
  };

  const isSelected = selected && status === 'available';

  // Color fill based on state
  let fillColor, textColor, shadowColor;
  if (status === 'paid') {
    fillColor = '#1c1c1c';
    textColor = '#f5f0e8';
    shadowColor = 'rgba(0,0,0,0.4)';
  } else if (status === 'reserved') {
    fillColor = '#d4a017';
    textColor = '#1c1c1c';
    shadowColor = 'rgba(212,160,23,0.3)';
  } else if (isSelected) {
    fillColor = '#c9a84c';
    textColor = '#1c1c1c';
    shadowColor = 'rgba(201,168,76,0.5)';
  } else {
    fillColor = '#5c6b4a';
    textColor = '#f5f0e8';
    shadowColor = 'rgba(92,107,74,0.3)';
  }

  const cursor = status === 'available' ? 'pointer' : 'not-allowed';
  const scale = animating ? 1.15 : 1;

  return (
    <div
      onClick={handleClick}
      title={
        status === 'available'
          ? `Número ${number} — Disponível`
          : status === 'reserved'
          ? `Número ${number} — Reservado`
          : `Número ${number} — Vendido`
      }
      style={{
        cursor,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        transform: `scale(${scale})`,
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.15s',
        filter: isSelected ? `drop-shadow(0 2px 6px ${shadowColor})` : `drop-shadow(0 1px 3px ${shadowColor})`,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Heart SVG */}
      <svg
        viewBox="0 0 100 90"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M50 82 C50 82 8 55 8 28 C8 14 19 5 30 5 C38 5 44 9 50 16 C56 9 62 5 70 5 C81 5 92 14 92 28 C92 55 50 82 50 82Z"
          fill={fillColor}
        />
        {/* Red X for paid numbers */}
        {status === 'paid' && (
          <>
            <line x1="35" y1="32" x2="65" y2="58" stroke="#e53e3e" strokeWidth="8" strokeLinecap="round" />
            <line x1="65" y1="32" x2="35" y2="58" stroke="#e53e3e" strokeWidth="8" strokeLinecap="round" />
          </>
        )}
        {/* Checkmark for selected */}
        {isSelected && (
          <polyline
            points="32,46 44,58 68,34"
            fill="none"
            stroke="#1c1c1c"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Number label */}
      {status !== 'paid' && (
        <span
          style={{
            position: 'absolute',
            fontSize: 'clamp(7px, 1.8vw, 11px)',
            fontWeight: '700',
            fontFamily: 'Lato, sans-serif',
            color: textColor,
            lineHeight: 1,
            pointerEvents: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          {number}
        </span>
      )}
    </div>
  );
}
