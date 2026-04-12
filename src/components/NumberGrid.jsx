import { useEffect, useRef } from 'react';
import HeartNumber from './HeartNumber.jsx';
import { supabase } from '../lib/supabase.js';

/**
 * Grid of 240 heart numbers with real-time updates via Supabase Realtime.
 * Parent manages the numbers state and selected numbers set.
 */
export default function NumberGrid({ numbers, selectedNumbers, onToggle, onNumbersUpdate }) {
  const channelRef = useRef(null);

  // Subscribe to real-time changes on raffle_numbers
  useEffect(() => {
    if (channelRef.current) return; // already subscribed

    channelRef.current = supabase
      .channel('raffle-numbers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_numbers' },
        (payload) => {
          onNumbersUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onNumbersUpdate]);

  if (!numbers || numbers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin-slow w-10 h-10 text-moss" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
          <p className="text-charcoal/50 font-body text-sm">Carregando números...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(15, 1fr)',
        gap: 'clamp(3px, 0.8vw, 8px)',
        padding: 'clamp(8px, 2vw, 16px)',
      }}
    >
      {numbers.map((item) => (
        <HeartNumber
          key={item.number}
          number={item.number}
          status={item.status}
          selected={selectedNumbers.has(item.number)}
          onClick={onToggle}
        />
      ))}
    </div>
  );
}
