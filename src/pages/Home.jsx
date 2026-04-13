import { useState, useEffect, useCallback, useRef } from 'react';
import NumberGrid from '../components/NumberGrid.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import StoryAvatar from '../components/StoryViewer.jsx';
import { fetchNumbers, fetchSettings } from '../lib/supabase.js';

// ─── Floral decoration SVG ─────────────────────────────────────────────────
function FloralCorner({ position }) {
  const transforms = {
    'top-left': 'translate(0,0)',
    'top-right': 'translate(120,0) scale(-1,1)',
    'bottom-left': 'translate(0,120) scale(1,-1)',
    'bottom-right': 'translate(120,120) scale(-1,-1)',
  };
  const posStyle = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
  };
  return (
    <div style={{ position: 'absolute', ...posStyle[position], width: 120, height: 120, opacity: 0.18, pointerEvents: 'none', zIndex: 0 }}>
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform={transforms[position]}>
          <path d="M10 110 Q30 70 60 50 Q80 35 100 10" stroke="#5c6b4a" strokeWidth="2" fill="none" />
          <path d="M35 75 Q20 55 40 50 Q50 65 35 75Z" fill="#5c6b4a" />
          <path d="M55 55 Q40 35 60 32 Q65 48 55 55Z" fill="#5c6b4a" />
          <path d="M75 38 Q62 20 80 18 Q83 33 75 38Z" fill="#5c6b4a" />
          <circle cx="100" cy="10" r="6" fill="#c9a84c" />
          <circle cx="100" cy="10" r="3" fill="#9c7b2e" />
          <ellipse cx="100" cy="2" rx="3" ry="5" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="108" cy="10" rx="5" ry="3" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="100" cy="18" rx="3" ry="5" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="92" cy="10" rx="5" ry="3" fill="#c9a84c" opacity="0.7" />
          <circle cx="15" cy="105" r="5" fill="#c9a84c" />
          <circle cx="15" cy="105" r="2.5" fill="#9c7b2e" />
          <ellipse cx="15" cy="98" rx="2.5" ry="4" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="22" cy="105" rx="4" ry="2.5" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="15" cy="112" rx="2.5" ry="4" fill="#c9a84c" opacity="0.7" />
          <ellipse cx="8" cy="105" rx="4" ry="2.5" fill="#c9a84c" opacity="0.7" />
          <circle cx="48" cy="62" r="2" fill="#c9a84c" opacity="0.5" />
          <circle cx="70" cy="44" r="1.5" fill="#c9a84c" opacity="0.4" />
          <circle cx="28" cy="88" r="1.5" fill="#5c6b4a" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

// ─── Legend pill ───────────────────────────────────────────────────────────
function LegendPill({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-body text-charcoal/60">{label}</span>
    </div>
  );
}

// ─── Dynamic Prize Card ────────────────────────────────────────────────────
function PrizeCard({ icon, place, value, extra, req, paidCount }) {
  const unlocked = paidCount >= req;
  const pct = Math.min(Math.round((paidCount / req) * 100), 100);
  const remaining = req - paidCount;

  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-500"
      style={{
        background: unlocked
          ? 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.06))'
          : 'rgba(255,255,255,0.04)',
        border: unlocked
          ? '1px solid rgba(201,168,76,0.4)'
          : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span
        className="text-3xl flex-shrink-0 mt-0.5 transition-all duration-500"
        style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)' }}
      >
        {icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="font-display font-bold text-xl transition-colors duration-500"
            style={{ color: unlocked ? '#c9a84c' : 'rgba(245,240,232,0.35)' }}>
            {place}
          </p>
          <p className="font-display font-bold text-xl transition-colors duration-500"
            style={{ color: unlocked ? '#c9a84c' : 'rgba(245,240,232,0.35)' }}>
            {value}
          </p>
        </div>

        {extra && (
          <div className="mb-3 space-y-0.5 transition-opacity duration-500"
            style={{ opacity: unlocked ? 1 : 0.3 }}>
            {extra.map((line, i) => (
              <p key={i} className="text-xs font-body"
                style={{ color: unlocked ? 'rgba(201,168,76,0.8)' : 'rgba(245,240,232,0.4)' }}>
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="h-1.5 rounded-full overflow-hidden mb-2"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: unlocked
                ? 'linear-gradient(90deg, #c9a84c, #e0c578)'
                : 'linear-gradient(90deg, #5c6b4a, #7a8c65)',
            }}
          />
        </div>

        {unlocked ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: 'rgba(92,107,74,0.25)' }}>
            <span className="text-xs" style={{ color: '#7a8c65' }}>🎉</span>
            <span className="text-xs font-body font-semibold" style={{ color: '#7a8c65' }}>
              Prêmio desbloqueado!
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>🔒</span>
            <span className="text-xs font-body" style={{ color: 'rgba(245,240,232,0.4)' }}>
              {paidCount}/{req} vendidos — faltam {remaining}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [numbers, setNumbers]               = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [showModal, setShowModal]           = useState(false);
  const [settings, setSettings]             = useState({});
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const gridRef    = useRef(null);
  const [gridVisible, setGridVisible] = useState(false);

  // Observa se a grade está visível na tela
  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setGridVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [loading]); // re-observa após o loading terminar

  // ── FIX: use a ref to track modal state inside the realtime callback.
  // This avoids the callback removing the user's own numbers from selectedNumbers
  // right after they click "Reservar" (which triggers a realtime reserved update).
  const showModalRef = useRef(false);
  useEffect(() => {
    showModalRef.current = showModal;
  }, [showModal]);

  useEffect(() => {
    async function load() {
      try {
        const [nums, cfg] = await Promise.all([fetchNumbers(), fetchSettings()]);
        setNumbers(nums);
        setSettings(cfg);
      } catch (err) {
        setError('Erro ao carregar a rifa. Por favor, recarregue a página.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNumbersUpdate = useCallback((payload) => {
    if (payload.eventType === 'UPDATE') {
      // Always update the visual status of the number in the grid
      setNumbers((prev) =>
        prev.map((n) =>
          n.number === payload.new.number
            ? { ...n, status: payload.new.status, reservation_id: payload.new.reservation_id }
            : n
        )
      );
      // Only deselect if the modal is NOT open — otherwise we'd be removing
      // the user's own freshly-reserved numbers from the sticky bar.
      if (payload.new.status !== 'available' && !showModalRef.current) {
        setSelectedNumbers((prev) => {
          const next = new Set(prev);
          next.delete(payload.new.number);
          return next;
        });
      }
    }
  }, []); // stable — reads showModalRef via ref, no deps needed

  const toggleNumber = useCallback((num) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }, []);

  const handleReserveClick = () => {
    if (selectedNumbers.size === 0) {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setShowModal(true);
  };

  const pricePerNumber = parseInt(settings.price_per_number || '20');
  const totalSelected  = selectedNumbers.size;
  const totalValue     = totalSelected * pricePerNumber;
  const drawDate = settings.draw_date
    ? new Date(settings.draw_date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '10 de agosto de 2026';

  const paidCount      = numbers.filter((n) => n.status === 'paid').length;
  const reservedCount  = numbers.filter((n) => n.status === 'reserved').length;
  const availableCount = numbers.filter((n) => n.status === 'available').length;

  const prizes = [
    {
      icon: '🥇',
      place: '1º Lugar',
      value: 'R$ 500',
      extra: [
        '👸 Mulher: Dia de princesa — cabelo, unha, maquiagem e sobrancelha',
        '🧴 Homem: Kit Natura',
      ],
      req: 100,
    },
    { icon: '🥈', place: '2º Lugar', value: 'R$ 300', extra: null, req: 150 },
    { icon: '🥉', place: '3º Lugar', value: 'R$ 200', extra: null, req: 200 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-16 h-16 text-moss animate-pulse" viewBox="0 0 100 90" fill="currentColor">
            <path d="M50 82 C50 82 8 55 8 28 C8 14 19 5 30 5 C38 5 44 9 50 16 C56 9 62 5 70 5 C81 5 92 14 92 28 C92 55 50 82 50 82Z" />
          </svg>
          <p className="font-display text-xl text-moss">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-display text-2xl text-charcoal mb-3">Oops!</p>
          <p className="text-charcoal/60 font-body">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 rounded-xl bg-moss text-cream font-body font-bold text-sm">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream" style={{ fontFamily: 'Lato, sans-serif' }}>

      {/* ── HERO ── */}
      <header className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #f5f0e8 60%, #e8e0d0 100%)' }}>
        <FloralCorner position="top-left" />
        <FloralCorner position="top-right" />
        <div className="relative z-10 px-6 pt-10 pb-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="font-display font-bold leading-tight text-charcoal"
              style={{ fontSize: 'clamp(32px, 8vw, 52px)', letterSpacing: '-0.02em' }}>
              Chá Rifa dos<br />Noivos
            </h1>
            <p className="font-script text-gold mt-1"
              style={{ fontSize: 'clamp(26px, 6vw, 38px)', letterSpacing: '0.02em' }}>
              ✦ Gabrielly & Railson ✦
            </p>
          </div>

          {/* Story avatar — clique para ver as fotos */}
          <div className="flex justify-center mb-6">
            <StoryAvatar size={180} />
          </div>

          <p className="text-center font-body text-charcoal/70 leading-relaxed mx-auto"
            style={{ maxWidth: 380, fontSize: 'clamp(13px, 3.5vw, 15px)' }}>
            Estamos organizando nosso tão sonhado casamento, e você pode fazer parte dessa
            história! Participe da nossa rifa e nos ajude a tornar esse momento ainda mais especial.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-moss">{paidCount}</p>
              <p className="text-xs text-charcoal/50 font-body">vendidos</p>
            </div>
            <div className="w-px h-8 bg-charcoal/15" />
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-amber">{reservedCount}</p>
              <p className="text-xs text-charcoal/50 font-body">reservados</p>
            </div>
            <div className="w-px h-8 bg-charcoal/15" />
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-charcoal">{availableCount}</p>
              <p className="text-xs text-charcoal/50 font-body">disponíveis</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── GRID ── */}
      <section ref={gridRef} className="max-w-2xl mx-auto px-3 py-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="font-display font-semibold text-charcoal text-lg">Escolha seus números</h2>
          <span className="text-xs font-body text-charcoal/50 bg-cream-dark px-3 py-1 rounded-full border border-charcoal/10">
            1 número = R$ {pricePerNumber}
          </span>
        </div>
        <div className="flex items-center gap-4 px-2 mb-4 flex-wrap">
          <LegendPill color="#5c6b4a" label="Disponível" />
          <LegendPill color="#d4a017" label="Reservado" />
          <LegendPill color="#1c1c1c" label="Vendido" />
          <LegendPill color="#c9a84c" label="Selecionado" />
        </div>
        <div className="rounded-2xl border border-charcoal/10 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #f0ebe0, #e8e0d0)' }}>
          <NumberGrid
            numbers={numbers}
            selectedNumbers={selectedNumbers}
            onToggle={toggleNumber}
            onNumbersUpdate={handleNumbersUpdate}
          />
        </div>
      </section>

      {/* ── PRIZES — dinâmico ── */}
      <section className="py-10 px-6 relative overflow-hidden" style={{ background: '#1c1c1c' }}>
        <FloralCorner position="bottom-left" />
        <FloralCorner position="bottom-right" />

        <div className="max-w-lg mx-auto relative z-10">
          <h2 className="font-display font-bold text-center mb-1"
            style={{ color: '#c9a84c', fontSize: 'clamp(22px, 5vw, 28px)' }}>
            Premiação
          </h2>
          <p className="text-center font-body text-sm mb-3"
            style={{ color: 'rgba(245,240,232,0.45)' }}>
            Sorteio: {drawDate}
          </p>

          <div className="mb-8 px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-body" style={{ color: 'rgba(245,240,232,0.4)' }}>
                {paidCount} números vendidos
              </span>
              <span className="text-xs font-body font-bold" style={{ color: 'rgba(201,168,76,0.7)' }}>
                meta: 200
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((paidCount / 200) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #3d4a30, #5c6b4a, #c9a84c)',
                }}
              />
            </div>
            <div className="relative mt-1.5" style={{ height: 16 }}>
              {prizes.map((p) => (
                <div key={p.req} className="absolute flex flex-col items-center"
                  style={{ left: `${(p.req / 200) * 100}%`, transform: 'translateX(-50%)' }}>
                  <div className="w-0.5 h-2 rounded-full"
                    style={{ background: paidCount >= p.req ? '#c9a84c' : 'rgba(255,255,255,0.2)' }} />
                  <span className="text-xs font-body"
                    style={{ fontSize: 9, color: paidCount >= p.req ? '#c9a84c' : 'rgba(255,255,255,0.25)' }}>
                    {p.req}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {prizes.map((prize) => (
              <PrizeCard key={prize.place} {...prize} paidCount={paidCount} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-10 px-6 max-w-lg mx-auto">
        <h2 className="font-display font-bold text-center text-charcoal mb-6"
          style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>
          Como funciona?
        </h2>
        <div className="space-y-4">
          {[
            { icon: '1️⃣', title: 'Escolha seus números', desc: 'Selecione quantos corações quiser na grade acima.' },
            { icon: '2️⃣', title: 'Informe seus dados', desc: 'Preencha seu nome e WhatsApp para reservar.' },
            { icon: '3️⃣', title: 'Pague via PIX', desc: 'Escaneie o QR Code ou copie o código. Cada número = R$ 20.' },
            { icon: '4️⃣', title: 'Confirme pelo WhatsApp', desc: 'Envie o comprovante para o número (34) 99173-7875 e seus números serão confirmados!' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-cream-dark rounded-2xl p-4 border border-charcoal/8">
              <span className="text-2xl flex-shrink-0">{step.icon}</span>
              <div>
                <p className="font-body font-bold text-charcoal text-sm">{step.title}</p>
                <p className="font-body text-charcoal/60 text-sm mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-white rounded-2xl p-5 border border-charcoal/10 text-center shadow-sm">
          <p className="text-xs text-charcoal/40 uppercase tracking-wider font-body mb-2">Chave PIX</p>
          <p className="font-display font-bold text-2xl text-moss tracking-wider">34-991737875</p>
          <p className="text-xs text-charcoal/40 font-body mt-1">Railson Silva · Mercado Pago</p>
        </div>
      </section>

      {/* ── FOOTER com botão admin discreto ── */}
      <footer className="py-8 px-6 text-center border-t border-charcoal/8">
        <p className="font-script text-gold text-2xl mb-1">Gabrielly & Railson</p>
        <p className="text-xs font-body text-charcoal/30 mb-6">
          Feito com ♥ para o nosso casamento
        </p>
        {/* Botão admin — discreto, sem chamar atenção */}
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-body text-charcoal/20 hover:text-charcoal/50 transition-colors"
          style={{ textDecoration: 'none' }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 9.5a5 5 0 01-4.33-2.5C3.68 8.22 6 7 8 7s4.32 1.22 4.33 3A5 5 0 018 12.5z"/>
          </svg>
          Área restrita
        </a>
      </footer>

      <div className="h-28" />

      {/* ── STICKY BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300"
        style={{ transform: totalSelected > 0 ? 'translateY(0)' : 'translateY(100%)' }}>
        <div className="px-4 pt-4 pb-6 md:pb-4"
          style={{ background: 'linear-gradient(to top, #f5f0e8 80%, transparent)' }}>
          <div className="max-w-lg mx-auto rounded-2xl overflow-hidden shadow-2xl border border-charcoal/10"
            style={{ background: '#fff' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-body font-bold text-charcoal text-sm">
                  {totalSelected} número{totalSelected !== 1 ? 's' : ''} selecionado{totalSelected !== 1 ? 's' : ''}
                </p>
                <p className="font-display font-bold text-moss text-xl">
                  R$ {totalValue.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <button onClick={handleReserveClick}
                className="animate-pulse-gold flex-shrink-0 px-6 py-3 rounded-xl font-body font-bold text-charcoal text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)' }}>
                Reservar e Pagar →
              </button>
            </div>
            {totalSelected > 0 && totalSelected <= 20 && (
              <div className="px-5 pb-3 flex flex-wrap gap-1.5 border-t border-charcoal/5 pt-2.5">
                {Array.from(selectedNumbers).sort((a, b) => a - b).map((n) => (
                  <button key={n} onClick={() => toggleNumber(n)}
                    className="text-xs font-bold bg-moss text-cream px-2.5 py-1 rounded-full font-body flex items-center gap-1 hover:bg-moss-dark transition-colors">
                    {n}
                    <span className="text-cream/60 text-xs">✕</span>
                  </button>
                ))}
              </div>
            )}
            {totalSelected > 20 && (
              <p className="px-5 pb-3 text-xs text-charcoal/40 font-body border-t border-charcoal/5 pt-2.5">
                {Array.from(selectedNumbers).sort((a,b)=>a-b).slice(0,10).join(', ')} ... e mais {totalSelected - 10}
              </p>
            )}
          </div>
        </div>
      </div>

      {totalSelected === 0 && !gridVisible && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="pointer-events-auto font-body font-bold text-white text-sm shadow-2xl transition-all duration-200 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #dc2743, #cc2366)',
              padding: '14px 28px',
              borderRadius: 50,
              boxShadow: '0 6px 24px rgba(220,39,67,0.5)',
              letterSpacing: '0.02em',
              border: '2px solid rgba(255,255,255,0.25)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg viewBox="0 0 100 90" fill="white" style={{ width: 16, height: 16 }}>
              <path d="M50 82 C50 82 8 55 8 28 C8 14 19 5 30 5 C38 5 44 9 50 16 C56 9 62 5 70 5 C81 5 92 14 92 28 C92 55 50 82 50 82Z" />
            </svg>
            Escolher meus números
          </button>
        </div>
      )}

      {showModal && (
        <PaymentModal
          selectedNumbers={selectedNumbers}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setSelectedNumbers(new Set()); }}
        />
      )}
    </div>
  );
}
