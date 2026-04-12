import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Animated slot-machine style draw component.
 * After revealing the winning number, fetches and shows the buyer's name.
 */
export default function DrawAnimation({ paidNumbers, onClose }) {
  const [phase, setPhase]               = useState('idle'); // 'idle' | 'spinning' | 'revealing' | 'done'
  const [winner, setWinner]             = useState(null);   // winning number
  const [winnerName, setWinnerName]     = useState(null);   // buyer name
  const [winnerWpp, setWinnerWpp]       = useState(null);   // buyer whatsapp
  const [loadingName, setLoadingName]   = useState(false);
  const [displayNumber, setDisplayNumber] = useState('???');
  const intervalRef = useRef(null);

  // Fetch buyer info for a given number
  const fetchWinnerInfo = async (number) => {
    setLoadingName(true);
    try {
      // Find the confirmed reservation that contains this number
      const { data, error } = await supabase
        .from('reservations')
        .select('buyer_name, buyer_whatsapp, numbers')
        .eq('status', 'confirmed');

      if (error) throw error;

      const reservation = data?.find((r) => (r.numbers || []).includes(number));
      if (reservation) {
        setWinnerName(reservation.buyer_name);
        setWinnerWpp(reservation.buyer_whatsapp);
      } else {
        setWinnerName('Comprador não encontrado');
        setWinnerWpp(null);
      }
    } catch {
      setWinnerName('Erro ao buscar nome');
      setWinnerWpp(null);
    } finally {
      setLoadingName(false);
    }
  };

  const startDraw = () => {
    if (paidNumbers.length === 0) return;
    setPhase('spinning');
    setWinner(null);
    setWinnerName(null);
    setWinnerWpp(null);

    let ticks = 0;
    const maxTicks = 40;
    const chosenWinner = paidNumbers[Math.floor(Math.random() * paidNumbers.length)];

    intervalRef.current = setInterval(() => {
      ticks++;
      const randomNum = paidNumbers[Math.floor(Math.random() * paidNumbers.length)];
      setDisplayNumber(randomNum.toString().padStart(3, '0'));

      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current);
        setDisplayNumber(chosenWinner.toString().padStart(3, '0'));
        setWinner(chosenWinner);
        setPhase('revealing');
        fetchWinnerInfo(chosenWinner).then(() => setPhase('done'));
      }
    }, 80);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleNewDraw = () => {
    setPhase('idle');
    setWinner(null);
    setWinnerName(null);
    setWinnerWpp(null);
    setDisplayNumber('???');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-cream w-full md:max-w-sm md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.35s ease-out' }}
      >
        {/* Header */}
        <div className="gradient-moss px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-cream text-lg font-semibold">🎰 Sorteio</h2>
            <p className="text-cream/70 text-xs mt-0.5 font-body">
              {paidNumbers.length} número{paidNumbers.length !== 1 ? 's' : ''} pagos participando
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-cream hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-6">

          {/* Slot display */}
          <div
            className="w-48 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: (phase === 'done' || phase === 'revealing')
                ? 'linear-gradient(135deg, #c9a84c, #e0c578)'
                : '#1c1c1c',
              boxShadow: (phase === 'done' || phase === 'revealing')
                ? '0 0 40px rgba(201,168,76,0.6), inset 0 0 20px rgba(201,168,76,0.2)'
                : '0 4px 20px rgba(0,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.3)',
              transition: 'background 0.5s, box-shadow 0.5s',
            }}
          >
            <div className="absolute top-3 left-4 right-4 h-px bg-white/10" />
            <div className="absolute bottom-3 left-4 right-4 h-px bg-white/10" />

            <span
              className="font-display font-bold text-6xl"
              style={{
                color: (phase === 'done' || phase === 'revealing') ? '#1c1c1c' : '#c9a84c',
                textShadow: phase === 'spinning' ? '0 0 20px rgba(201,168,76,0.8)' : 'none',
                transition: 'color 0.3s',
                letterSpacing: '-0.02em',
              }}
            >
              {displayNumber}
            </span>

            {phase === 'spinning' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px)',
                }}
              />
            )}
          </div>

          {/* Idle message */}
          {phase === 'idle' && (
            <p className="text-charcoal/50 text-sm font-body text-center">
              Clique no botão para iniciar o sorteio entre os {paidNumbers.length} números pagos.
            </p>
          )}

          {/* Spinning message */}
          {phase === 'spinning' && (
            <p className="text-moss font-body font-bold text-sm animate-pulse text-center">
              Sorteando...
            </p>
          )}

          {/* Revealing / loading name */}
          {phase === 'revealing' && (
            <div className="text-center space-y-2 animate-fade-in">
              <p className="text-3xl">🎉</p>
              <p className="font-display text-xl font-bold text-moss">
                Número {winner}!
              </p>
              <div className="flex items-center justify-center gap-2 text-charcoal/50 text-sm font-body">
                <span className="w-4 h-4 border-2 border-moss/30 border-t-moss rounded-full animate-spin inline-block" />
                Buscando ganhador...
              </div>
            </div>
          )}

          {/* Done — show winner name */}
          {phase === 'done' && winner && (
            <div className="w-full animate-fade-in space-y-3">
              <div className="text-center">
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-display text-xl font-bold text-moss">
                  Número {winner} — Ganhador!
                </p>
              </div>

              {/* Winner card */}
              <div
                className="rounded-2xl p-5 text-center space-y-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
                  border: '1px solid rgba(201,168,76,0.35)',
                }}
              >
                <p className="text-xs font-body uppercase tracking-wider text-charcoal/40 mb-2">
                  Ganhador
                </p>

                {loadingName ? (
                  <div className="flex items-center justify-center gap-2 text-charcoal/50 text-sm font-body">
                    <span className="w-3 h-3 border-2 border-moss/30 border-t-moss rounded-full animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <>
                    <p className="font-display font-bold text-2xl text-gold leading-tight">
                      {winnerName || '—'}
                    </p>
                    {winnerWpp && (
                      <a
                        href={`https://wa.me/55${winnerWpp}?text=${encodeURIComponent(`Parabéns! Seu número ${winner} foi sorteado na Rifa Gabrielly & Railson! 🎉🎊`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl font-body font-bold text-sm text-white transition-opacity hover:opacity-90"
                        style={{ background: '#25D366' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Notificar ganhador
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            {phase === 'idle' && (
              <button
                onClick={startDraw}
                disabled={paidNumbers.length === 0}
                className="flex-1 py-3.5 rounded-xl font-bold font-body text-charcoal text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)' }}
              >
                🎲 Iniciar Sorteio
              </button>
            )}

            {phase === 'spinning' && (
              <div className="flex-1 py-3.5 rounded-xl font-body text-center text-moss font-bold text-sm border-2 border-moss/30">
                Sorteando...
              </div>
            )}

            {phase === 'revealing' && (
              <div className="flex-1 py-3.5 rounded-xl font-body text-center text-gold font-bold text-sm border-2 border-gold/30">
                Buscando ganhador...
              </div>
            )}

            {phase === 'done' && (
              <>
                <button
                  onClick={handleNewDraw}
                  className="flex-1 py-3.5 rounded-xl font-bold font-body text-charcoal text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)' }}
                >
                  🔄 Sortear novamente
                </button>
                <button
                  onClick={onClose}
                  className="py-3.5 px-5 rounded-xl font-body text-charcoal/70 text-sm border border-charcoal/20 hover:bg-cream-dark transition-colors"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
