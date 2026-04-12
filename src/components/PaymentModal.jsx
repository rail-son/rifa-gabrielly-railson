import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { createReservation } from '../lib/supabase.js';
import { generateRifaPix } from '../lib/pix.js';

const PRICE_PER_NUMBER = 20;
const RESERVATION_MINUTES = 30;

export default function PaymentModal({ selectedNumbers, onClose, onSuccess }) {
  const [step, setStep] = useState('form'); // 'form' | 'payment'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '' });
  const [reservationId, setReservationId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(RESERVATION_MINUTES * 60);
  const [copied, setCopied] = useState(false);

  const numbers = Array.from(selectedNumbers).sort((a, b) => a - b);
  const totalValue = numbers.length * PRICE_PER_NUMBER;
  const pixCode = step === 'payment' ? generateRifaPix(totalValue, numbers) : '';

  // Countdown timer during payment step
  useEffect(() => {
    if (step !== 'payment') return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, onClose]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Auto-format WhatsApp: only digits
    if (name === 'whatsapp') {
      setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, '').substring(0, 11) }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  };

  const formatWhatsApp = (raw) => {
    const d = raw.replace(/\D/g, '');
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Por favor, informe seu nome.');
    if (formData.whatsapp.length < 10) return setError('WhatsApp inválido. Digite DDD + número.');

    setLoading(true);
    setError('');
    try {
      const id = await createReservation({
        buyerName: formData.name.trim(),
        buyerWhatsapp: formData.whatsapp,
        buyerEmail: formData.email.trim() || null,
        numbers,
        pricePerNumber: PRICE_PER_NUMBER,
      });
      setReservationId(id);
      setStep('payment');
    } catch (err) {
      if (err.message?.includes('already taken') || err.message?.includes('Numbers')) {
        setError('Alguns números que você escolheu acabaram de ser reservados por outra pessoa. Por favor, volte e selecione outros.');
      } else {
        setError('Ocorreu um erro ao criar sua reserva. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = pixCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Olá! Acabei de reservar os números ${numbers.join(', ')} da Rifa da Gabrielly & Railson.\n` +
      `Valor: R$ ${totalValue.toFixed(2)}\n` +
      `ID da reserva: ${reservationId}\n` +
      `Vou enviar o comprovante do PIX!`
    );
    window.open(`https://wa.me/5534991737875?text=${msg}`, '_blank');
  };

  // Se está na etapa de pagamento (reserva já criada), fechar = sucesso (limpa números).
  // Se está na etapa de formulário (ainda não reservou), fechar = apenas fecha (mantém números).
  const handleClose = () => step === 'payment' ? onSuccess() : onClose();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div
        className="bg-cream w-full md:max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.35s ease-out', maxHeight: '95vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="gradient-moss px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-cream text-lg font-semibold">
              {step === 'form' ? '💌 Confirmar Reserva' : '💚 Pagar com PIX'}
            </h2>
            <p className="text-cream/70 text-xs mt-0.5 font-body">
              {numbers.length} número{numbers.length > 1 ? 's' : ''} •{' '}
              <span className="font-bold text-gold-light">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-cream hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Numbers selected */}
        <div className="px-6 py-3 bg-cream-dark border-b border-charcoal/10">
          <p className="text-xs text-charcoal/50 mb-1.5 font-body uppercase tracking-wider">Seus números</p>
          <div className="flex flex-wrap gap-1.5">
            {numbers.map((n) => (
              <span
                key={n}
                className="text-xs font-bold bg-moss text-cream px-2 py-0.5 rounded-full font-body"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* STEP 1 — Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1.5 font-body">
                Nome completo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-body text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1.5 font-body">
                WhatsApp *
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formatWhatsApp(formData.whatsapp)}
                onChange={handleChange}
                placeholder="(34) 99999-9999"
                required
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-body text-sm"
              />
              <p className="text-xs text-charcoal/40 mt-1 font-body">
                Usado apenas para confirmação do pagamento
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1.5 font-body">
                E-mail (opcional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss focus:border-transparent font-body text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-body">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-charcoal font-body text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  Reservando...
                </span>
              ) : (
                `Reservar e ir para o PIX →`
              )}
            </button>

            <p className="text-xs text-center text-charcoal/40 font-body">
              ⏱ Sua reserva expira em {RESERVATION_MINUTES} minutos após confirmar
            </p>
          </form>
        )}

        {/* STEP 2 — Payment */}
        {step === 'payment' && (
          <div className="px-6 py-5 space-y-5">
            {/* Timer */}
            <div
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-body text-sm font-bold ${
                timeLeft < 300
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-amber/10 text-amber-700 border border-amber/30'
              }`}
            >
              ⏱ Reserva expira em{' '}
              <span className="text-lg font-display font-bold">{formatTime(timeLeft)}</span>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-charcoal/10">
                <QRCode
                  value={pixCode}
                  size={200}
                  level="M"
                  style={{ height: 'auto', maxWidth: '100%', width: '200px' }}
                />
              </div>
              <p className="text-xs text-charcoal/50 font-body text-center">
                Escaneie com o app do seu banco
              </p>
            </div>

            {/* Amount highlight */}
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-moss">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-charcoal/50 font-body mt-1">
                Rifa- Gabrielly & Railson · Railson Silva · Mercado Pago
              </p>
            </div>

            {/* Copy PIX button */}
            <button
              onClick={handleCopyPix}
              className="w-full py-3.5 rounded-xl font-bold font-body text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: copied
                  ? 'linear-gradient(135deg, #5c6b4a, #7a8c65)'
                  : 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)',
                color: copied ? '#f5f0e8' : '#1c1c1c',
              }}
            >
              {copied ? '✓ Código copiado!' : '📋 Copiar código PIX'}
            </button>

            {/* Pix code (truncated) */}
            <div className="bg-white rounded-xl p-3 border border-charcoal/10">
              <p className="text-xs text-charcoal/40 font-body mb-1 uppercase tracking-wider">Código PIX</p>
              <p
                className="text-xs font-body text-charcoal/70 break-all leading-relaxed cursor-pointer"
                onClick={handleCopyPix}
                title="Clique para copiar"
              >
                {pixCode.substring(0, 80)}...
              </p>
            </div>

            {/* WhatsApp notification */}
            <button
              onClick={handleWhatsApp}
              className="w-full py-3.5 rounded-xl font-bold font-body text-sm bg-[#25D366] text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Enviar comprovante no WhatsApp
            </button>

            <div className="bg-moss/10 rounded-xl p-4 border border-moss/20">
              <p className="text-xs font-body text-charcoal/70 leading-relaxed">
                <strong className="text-moss">📌 Importante:</strong> Após pagar, envie o comprovante
                via WhatsApp para confirmar seus números. Reservas não confirmadas são liberadas
                automaticamente após {RESERVATION_MINUTES} minutos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
