import { useState, useEffect } from 'react';
import {
  supabase, fetchStats, fetchReservations,
  confirmReservation, cancelReservation,
  updateSetting, adminRegisterNumbers,
} from '../lib/supabase.js';
import DrawAnimation from '../components/DrawAnimation.jsx';
import { format } from 'date-fns';

// ─── Login Screen ──────────────────────────────────────────────────────────
function AdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
    } catch {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-gold mb-4">
            <svg viewBox="0 0 100 90" fill="#1c1c1c" className="w-8 h-8">
              <path d="M50 82 C50 82 8 55 8 28 C8 14 19 5 30 5 C38 5 44 9 50 16 C56 9 62 5 70 5 C81 5 92 14 92 28 C92 55 50 82 50 82Z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-cream text-2xl">Painel Admin</h1>
          <p className="text-cream/40 font-body text-sm mt-1">Rifa — Gabrielly & Railson</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <div>
            <label className="block text-xs font-body font-bold text-cream/50 uppercase tracking-wider mb-1.5">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@email.com"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-cream placeholder-cream/30 focus:outline-none focus:ring-2 focus:ring-gold font-body text-sm" />
          </div>
          <div>
            <label className="block text-xs font-body font-bold text-cream/50 uppercase tracking-wider mb-1.5">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-cream placeholder-cream/30 focus:outline-none focus:ring-2 focus:ring-gold font-body text-sm" />
          </div>
          {error && <p className="text-red-400 text-sm font-body bg-red-500/10 rounded-xl px-4 py-2.5">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-body font-bold text-charcoal text-sm transition-all disabled:opacity-60 gradient-gold">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-cream/20 text-xs font-body mt-4">Acesso restrito — Gabrielly & Railson</p>
        <div className="text-center mt-3">
          <a href="/" className="text-cream/30 hover:text-cream/60 text-xs font-body transition-colors">
            ← Voltar para o site
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, subvalue, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-charcoal/8 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-body font-bold text-charcoal/50 uppercase tracking-wider">{label}</p>
          <p className="font-display font-bold text-3xl mt-1" style={{ color }}>{value}</p>
          {subvalue && <p className="text-xs text-charcoal/40 font-body mt-0.5">{subvalue}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Manual Register Modal ─────────────────────────────────────────────────
function ManualRegisterModal({ availableNumbers, pricePerNumber, onClose, onSuccess }) {
  const [form, setForm]         = useState({ name: '', whatsapp: '', email: '' });
  const [selected, setSelected] = useState(new Set());
  const [inputNum, setInputNum] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
      setForm(p => ({ ...p, [name]: value.replace(/\D/g, '').substring(0, 11) }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const formatWpp = raw => {
    const d = raw.replace(/\D/g, '');
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  };

  const addNumber = () => {
    const n = parseInt(inputNum);
    if (!n || n < 1 || n > 240) return setError('Número inválido (deve ser entre 1 e 240).');
    if (!availableNumbers.includes(n)) return setError(`Número ${n} não está disponível (já reservado ou pago).`);
    if (selected.has(n)) return setError(`Número ${n} já foi adicionado.`);
    setSelected(p => new Set([...p, n]));
    setInputNum('');
    setError('');
  };

  const removeNumber = n => setSelected(p => { const s = new Set(p); s.delete(n); return s; });

  const totalValue = selected.size * pricePerNumber;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Informe o nome completo do comprador.');
    if (form.whatsapp.length < 10) return setError('WhatsApp inválido. Use DDD + número.');
    if (selected.size === 0) return setError('Adicione ao menos um número.');
    setLoading(true);
    setError('');
    try {
      await adminRegisterNumbers({
        buyerName: form.name.trim(),
        buyerWhatsapp: form.whatsapp,
        buyerEmail: form.email.trim() || null,
        numbers: Array.from(selected),
        pricePerNumber,
      });
      onSuccess();
    } catch (err) {
      if (err.message?.includes('already taken') || err.message?.includes('Numbers')) {
        setError('Um ou mais números já foram reservados. Remova-os e tente novamente.');
      } else {
        setError('Erro ao registrar: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-cream w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.35s ease-out', maxHeight: '95vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="gradient-moss px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-cream text-lg font-semibold">✍️ Registro Manual</h2>
            <p className="text-cream/70 text-xs mt-0.5 font-body">Registrar compra realizada fora do site</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-cream hover:bg-white/30 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Buyer info */}
          <div className="space-y-3">
            <h3 className="font-body font-bold text-charcoal text-sm uppercase tracking-wider text-charcoal/50">Dados do comprador</h3>
            <div>
              <label className="block text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-1.5 font-body">Nome completo *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Nome de quem comprou"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss font-body text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-1.5 font-body">WhatsApp *</label>
                <input type="tel" name="whatsapp" value={formatWpp(form.whatsapp)} onChange={handleChange} required placeholder="(34) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss font-body text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-1.5 font-body">E-mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="opcional"
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss font-body text-sm" />
              </div>
            </div>
          </div>

          {/* Number selector */}
          <div className="space-y-3">
            <h3 className="font-body font-bold text-charcoal/50 text-sm uppercase tracking-wider">Números comprados</h3>
            <div className="flex gap-2">
              <input
                type="number" min="1" max="240"
                value={inputNum}
                onChange={e => setInputNum(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } }}
                placeholder="Digite um número (1–240)"
                className="flex-1 px-4 py-3 rounded-xl border border-charcoal/20 bg-white focus:outline-none focus:ring-2 focus:ring-moss font-body text-sm"
              />
              <button type="button" onClick={addNumber}
                className="px-5 py-3 rounded-xl font-body font-bold text-sm bg-moss text-cream hover:bg-moss-dark transition-colors whitespace-nowrap">
                + Adicionar
              </button>
            </div>

            {selected.size > 0 ? (
              <div className="bg-white rounded-xl p-3 border border-charcoal/10">
                <p className="text-xs text-charcoal/40 font-body mb-2">Toque em um número para remover:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selected).sort((a, b) => a - b).map(n => (
                    <button key={n} type="button" onClick={() => removeNumber(n)}
                      className="text-xs font-bold bg-moss text-cream px-3 py-1 rounded-full font-body flex items-center gap-1.5 hover:bg-red-600 transition-colors group">
                      {n}
                      <span className="text-cream/50 group-hover:text-white">✕</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-cream-dark rounded-xl p-4 text-center border border-charcoal/10">
                <p className="text-charcoal/40 text-sm font-body">Nenhum número adicionado ainda</p>
              </div>
            )}
          </div>

          {/* Total */}
          {selected.size > 0 && (
            <div className="bg-moss/10 rounded-xl p-4 border border-moss/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-body font-bold text-moss">
                  {selected.size} número{selected.size > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-charcoal/50 font-body">R$ {pricePerNumber},00 cada</p>
              </div>
              <p className="font-display font-bold text-2xl text-moss">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-sm font-body">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3">
            <p className="text-xs font-body leading-relaxed" style={{ color: '#7a5c00' }}>
              <strong>ℹ️ Registro manual:</strong> Os números serão marcados diretamente como <strong>pagos e confirmados</strong>, sem passar pela etapa de reserva pendente. Use apenas para pagamentos já recebidos fora do site.
            </p>
          </div>

          <button type="submit" disabled={loading || selected.size === 0}
            className="w-full py-4 rounded-xl font-bold text-charcoal font-body text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e0c578, #c9a84c)' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                  Registrando...
                </span>
              : `✅ Confirmar ${selected.size} número${selected.size !== 1 ? 's' : ''} — R$ ${totalValue.toFixed(2).replace('.', ',')}`
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Prize Progress Card ───────────────────────────────────────────────────
function PrizeProgressCard({ paidCount }) {
  const prizes = [
    { place: '1º Lugar', icon: '🥇', value: 'R$ 500', extra: 'Dia de princesa (mulher) · Kit Natura (homem)', req: 100 },
    { place: '2º Lugar', icon: '🥈', value: 'R$ 300', extra: null, req: 150 },
    { place: '3º Lugar', icon: '🥉', value: 'R$ 200', extra: null, req: 200 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-charcoal/8 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-charcoal/8">
        <p className="font-body font-bold text-sm text-charcoal">Status dos Prêmios</p>
        <p className="text-xs text-charcoal/40 font-body mt-0.5">
          {paidCount} número{paidCount !== 1 ? 's' : ''} pagos até agora
        </p>
      </div>
      <div className="divide-y divide-charcoal/5">
        {prizes.map(prize => {
          const unlocked = paidCount >= prize.req;
          const pct = Math.min(Math.round((paidCount / prize.req) * 100), 100);
          return (
            <div key={prize.place} className={`px-5 py-4 transition-colors ${unlocked ? 'bg-moss/5' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5"
                  style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                  {prize.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <span className={`font-display font-bold text-base ${unlocked ? 'text-moss' : 'text-charcoal/40'}`}>
                      {prize.place} — {prize.value}
                    </span>
                    {unlocked
                      ? <span className="text-xs font-body font-bold px-2.5 py-0.5 rounded-full bg-moss/20 text-moss-dark">🎉 Desbloqueado!</span>
                      : <span className="text-xs font-body px-2.5 py-0.5 rounded-full bg-cream-dark text-charcoal/40">
                          🔒 faltam {prize.req - paidCount}
                        </span>
                    }
                  </div>
                  {prize.extra && (
                    <p className={`text-xs font-body mb-2 ${unlocked ? 'text-charcoal/60' : 'text-charcoal/30'}`}>
                      {prize.extra}
                    </p>
                  )}
                  <div className="h-2 bg-cream-dark rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: unlocked
                          ? 'linear-gradient(90deg, #c9a84c, #e0c578)'
                          : 'linear-gradient(90deg, #5c6b4a, #7a8c65)',
                      }} />
                  </div>
                  <p className={`text-xs font-body ${unlocked ? 'text-moss/70' : 'text-charcoal/30'}`}>
                    {paidCount} / {prize.req} números
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Panel ───────────────────────────────────────────────────────────
export default function Admin() {
  const [session, setSession]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('dashboard');
  const [stats, setStats]                 = useState(null);
  const [reservations, setReservations]   = useState([]);
  const [statusFilter, setStatusFilter]   = useState('all');
  const [numbers, setNumbers]             = useState([]);
  const [showDraw, setShowDraw]           = useState(false);
  const [showManual, setShowManual]       = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [settingsEdit, setSettingsEdit]   = useState({});
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [successMsg, setSuccessMsg]       = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session]);

  const loadAll = async () => {
    try {
      const [s, r, nums] = await Promise.all([
        fetchStats(),
        fetchReservations(),
        supabase.from('raffle_numbers').select('number, status').order('number'),
      ]);
      setStats(s);
      setSettingsEdit(s.settings || {});
      setReservations(r);
      setNumbers(nums.data || []);
    } catch (err) {
      console.error('Admin load error:', err);
    }
  };

  const showToast = msg => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleConfirm = async (id, whatsapp, name, nums) => {
    setActionLoading(id + '_confirm');
    try {
      await confirmReservation(id);
      await loadAll();
      const msg = encodeURIComponent(
        `Olá ${name}! 🎉 Pagamento confirmado!\nSeus números: ${nums.join(', ')}\nBoa sorte na Rifa Gabrielly & Railson! 💚`
      );
      window.open(`https://wa.me/55${whatsapp}?text=${msg}`, '_blank');
    } catch (err) {
      alert('Erro ao confirmar: ' + err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar esta reserva? Os números serão liberados.')) return;
    setActionLoading(id + '_cancel');
    try {
      await cancelReservation(id);
      await loadAll();
    } catch (err) {
      alert('Erro ao cancelar: ' + err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleManualSuccess = async () => {
    setShowManual(false);
    await loadAll();
    showToast('Números registrados com sucesso!');
  };

  const handleExportCSV = () => {
    const header = ['Nome', 'WhatsApp', 'Email', 'Números', 'Valor', 'Status', 'Data'];
    const rows = reservations.map(r => [
      r.buyer_name, r.buyer_whatsapp, r.buyer_email || '',
      (r.numbers || []).join(' | '),
      `R$ ${parseFloat(r.total_value).toFixed(2)}`,
      r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Aguardando' : 'Cancelado',
      r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm') : '',
    ]);
    const csv = [header, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rifa-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async () => {
    try {
      await Promise.all(Object.entries(settingsEdit).map(([k, v]) => updateSetting(k, v)));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
      await loadAll();
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  const filteredReservations = statusFilter === 'all'
    ? reservations
    : reservations.filter(r => r.status === statusFilter);

  const paidNumbers    = numbers.filter(n => n.status === 'paid').map(n => n.number);
  const availableNums  = numbers.filter(n => n.status === 'available').map(n => n.number);
  const pricePerNumber = parseInt(settingsEdit.price_per_number || '20');

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  const tabs = [
    { id: 'dashboard',    label: '📊 Dashboard' },
    { id: 'reservations', label: '📋 Reservas' },
    { id: 'grid',         label: '♥ Grade' },
    { id: 'settings',     label: '⚙️ Config' },
  ];

  return (
    <div className="min-h-screen bg-cream">

      {/* Top nav */}
      <header className="bg-charcoal px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <svg viewBox="0 0 100 90" fill="#1c1c1c" className="w-4 h-4">
              <path d="M50 82 C50 82 8 55 8 28 C8 14 19 5 30 5 C38 5 44 9 50 16 C56 9 62 5 70 5 C81 5 92 14 92 28 C92 55 50 82 50 82Z" />
            </svg>
          </div>
          <div>
            <p className="font-display font-bold text-cream text-sm leading-tight">Painel Admin</p>
            <p className="text-cream/40 text-xs font-body">Gabrielly & Railson</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/"
            className="px-3 py-1.5 rounded-lg bg-white/10 text-cream/60 font-body text-xs hover:bg-white/20 transition-colors flex items-center gap-1">
            ← Site
          </a>
          <button onClick={() => setShowManual(true)}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-cream/80 font-body font-bold text-xs hover:bg-white/20 transition-colors">
            ✍️ Registrar
          </button>
          <button onClick={() => setShowDraw(true)}
            className="px-3 py-1.5 rounded-lg gradient-gold font-body font-bold text-charcoal text-xs">
            🎲 Sortear
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-cream/60 font-body text-xs hover:bg-white/20 transition-colors">
            Sair
          </button>
        </div>
      </header>

      {/* Toast */}
      {successMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-moss text-cream text-sm font-body font-bold px-6 py-3 rounded-2xl shadow-xl animate-slide-up whitespace-nowrap">
          ✅ {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-charcoal/10 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 font-body font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-moss text-moss bg-moss/5' : 'border-transparent text-charcoal/50 hover:text-charcoal/80'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="💰" label="Arrecadado"  value={`R$ ${stats.totalCollected.toFixed(0)}`} subvalue="confirmados"    color="#5c6b4a" />
              <StatCard icon="⏳" label="Pendente"    value={`R$ ${stats.pendingValue.toFixed(0)}`}   subvalue="aguardando"     color="#d4a017" />
              <StatCard icon="✅" label="Vendidos"    value={stats.paid}      subvalue={`de ${stats.total}`}       color="#5c6b4a" />
              <StatCard icon="🔓" label="Disponíveis" value={stats.available} subvalue={`${stats.reserved} reservados`} color="#1c1c1c" />
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-2xl p-5 border border-charcoal/8 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-body font-bold text-sm text-charcoal">Progresso geral</p>
                <p className="font-body text-sm text-charcoal/50">{stats.paid}/{stats.total} números</p>
              </div>
              <div className="h-3 bg-cream-dark rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stats.paid / stats.total) * 100}%`, background: 'linear-gradient(90deg, #3d4a30, #5c6b4a, #7a8c65)' }} />
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[['#5c6b4a', `${stats.paid} pagos`], ['#d4a017', `${stats.reserved} reservados`], ['#e8e0d0', `${stats.available} disponíveis`]].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border border-charcoal/10" style={{ background: color }} />
                    <p className="text-xs font-body text-charcoal/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prize progress — dynamic based on real paid count */}
            <PrizeProgressCard paidCount={stats.paid} />
          </div>
        )}

        {/* ── RESERVATIONS ── */}
        {tab === 'reservations' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {['all','pending','confirmed','cancelled'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-body font-bold transition-colors ${
                      statusFilter === s ? 'bg-moss text-cream' : 'bg-white border border-charcoal/15 text-charcoal/60 hover:bg-cream-dark'
                    }`}>
                    {s==='all'?'Todos':s==='pending'?'⏳ Aguardando':s==='confirmed'?'✅ Confirmados':'❌ Cancelados'}
                  </button>
                ))}
              </div>
              <button onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg bg-white border border-charcoal/15 text-charcoal/70 text-xs font-body font-bold hover:bg-cream-dark transition-colors">
                ⬇ Exportar CSV
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-charcoal/8 overflow-hidden shadow-sm">
              {filteredReservations.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-charcoal/30 font-body text-sm">Nenhuma reserva encontrada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full admin-table">
                    <thead>
                      <tr><th>Nome</th><th>WhatsApp</th><th>Números</th><th>Valor</th><th>Status</th><th>Data</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map(r => (
                        <tr key={r.id}>
                          <td className="font-body font-bold text-charcoal">{r.buyer_name}</td>
                          <td>
                            <a href={`https://wa.me/55${r.buyer_whatsapp}`} target="_blank" rel="noreferrer"
                              className="text-moss hover:underline font-body text-sm">{r.buyer_whatsapp}</a>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(r.numbers||[]).slice(0,5).map(n => (
                                <span key={n} className="text-xs bg-moss/10 text-moss-dark px-1.5 py-0.5 rounded font-body font-bold">{n}</span>
                              ))}
                              {(r.numbers||[]).length > 5 && <span className="text-xs text-charcoal/40 font-body">+{r.numbers.length-5}</span>}
                            </div>
                          </td>
                          <td className="font-display font-bold text-sm">R$ {parseFloat(r.total_value).toFixed(2).replace('.',',')}</td>
                          <td>
                            <span className={r.status==='confirmed'?'badge-confirmed':r.status==='pending'?'badge-pending':'badge-cancelled'}>
                              {r.status==='confirmed'?'✅ Confirmado':r.status==='pending'?'⏳ Aguardando':'❌ Cancelado'}
                            </span>
                          </td>
                          <td className="text-xs text-charcoal/50 font-body whitespace-nowrap">
                            {r.created_at ? format(new Date(r.created_at), 'dd/MM HH:mm') : '—'}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => handleConfirm(r.id, r.buyer_whatsapp, r.buyer_name, r.numbers||[])}
                                    disabled={actionLoading === r.id+'_confirm'}
                                    className="px-2.5 py-1 rounded-lg bg-moss text-cream text-xs font-body font-bold hover:bg-moss-dark transition-colors disabled:opacity-50 whitespace-nowrap">
                                    {actionLoading === r.id+'_confirm' ? '...' : '✓ Confirmar'}
                                  </button>
                                  <button onClick={() => handleCancel(r.id)}
                                    disabled={actionLoading === r.id+'_cancel'}
                                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-body font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                                    {actionLoading === r.id+'_cancel' ? '...' : '✕'}
                                  </button>
                                </>
                              )}
                              {r.status === 'confirmed' && (
                                <a href={`https://wa.me/55${r.buyer_whatsapp}?text=${encodeURIComponent(`Olá ${r.buyer_name}! Seus números ${(r.numbers||[]).join(', ')} estão confirmados! 🎉`)}`}
                                  target="_blank" rel="noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-[#25D366]/10 text-[#128c7e] border border-[#25D366]/30 text-xs font-body font-bold hover:bg-[#25D366]/20 transition-colors">
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GRID ── */}
        {tab === 'grid' && (() => {
          // Build number → buyer name map from reservations (confirmed or pending)
          const buyerMap = {};
          reservations.forEach(r => {
            if (r.status === 'confirmed' || r.status === 'pending') {
              (r.numbers || []).forEach(num => {
                buyerMap[num] = {
                  name: r.buyer_name,
                  wpp: r.buyer_whatsapp,
                  status: r.status,
                };
              });
            }
          });

          const tooltipFor = (n) => {
            if (n.status === 'available') return `Número ${n.number} — Disponível`;
            const buyer = buyerMap[n.number];
            if (!buyer) return `Número ${n.number} — ${n.status === 'paid' ? 'Pago' : 'Reservado'}`;
            const statusLabel = buyer.status === 'confirmed' ? 'Pago' : 'Reservado';
            return `Número ${n.number} — ${statusLabel}\n👤 ${buyer.name}\n📱 ${buyer.wpp}`;
          };

          return (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-body text-sm text-charcoal/60">
                  <span className="font-bold text-moss">{paidNumbers.length}</span> pagos ·{' '}
                  <span className="font-bold text-amber">{numbers.filter(n=>n.status==='reserved').length}</span> reservados ·{' '}
                  <span className="font-bold">{availableNums.length}</span> disponíveis
                </p>
                <button onClick={() => setShowManual(true)}
                  className="px-4 py-2 rounded-xl bg-moss text-cream text-xs font-body font-bold hover:bg-moss-dark transition-colors">
                  ✍️ Registrar manual
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-charcoal/8 overflow-hidden shadow-sm p-4">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  {[['#5c6b4a','Disponível'],['#d4a017','Reservado'],['#1c1c1c','Pago']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full" style={{background:c}} />
                      <span className="text-xs font-body text-charcoal/60">{l}</span>
                    </div>
                  ))}
                  <p className="text-xs font-body text-charcoal/40 ml-auto">
                    Passe o mouse sobre um número para ver o comprador
                  </p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(15, 1fr)', gap:4 }}>
                  {numbers.map(n => (
                    <div key={n.number} title={tooltipFor(n)}
                      style={{
                        aspectRatio:'1', borderRadius:'50%',
                        background: n.status==='paid'?'#1c1c1c':n.status==='reserved'?'#d4a017':'#5c6b4a',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:15, fontWeight:700,
                        color: n.status==='reserved'?'#1c1c1c':'#f5f0e8',
                        fontFamily:'Lato, sans-serif',
                        cursor: n.status !== 'available' ? 'pointer' : 'default',
                      }}>
                      {n.number}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div className="animate-fade-in space-y-4 max-w-md">
            <div className="bg-white rounded-2xl border border-charcoal/8 p-5 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-charcoal text-lg">Configurações da Rifa</h3>
              {[
                { key:'couple_name',      label:'Nome do casal',        type:'text'   },
                { key:'draw_date',        label:'Data do sorteio',       type:'date'   },
                { key:'price_per_number', label:'Valor por número (R$)', type:'number' },
                { key:'pix_key',          label:'Chave PIX',             type:'text'   },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-1.5 font-body">{label}</label>
                  <input type={type} value={settingsEdit[key]||''} onChange={e => setSettingsEdit(p=>({...p,[key]:e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/15 bg-cream focus:outline-none focus:ring-2 focus:ring-moss font-body text-sm" />
                </div>
              ))}
              <button onClick={handleSaveSettings}
                className="w-full py-3.5 rounded-xl font-body font-bold text-charcoal text-sm gradient-gold">
                {settingsSaved ? '✓ Salvo!' : 'Salvar configurações'}
              </button>
            </div>
            <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4">
              <p className="text-sm font-body leading-relaxed" style={{color:'#7a5c00'}}>
                <strong>⚠️ Atenção:</strong> Alterações na chave PIX afetam imediatamente o QR Code gerado para novos compradores.
              </p>
            </div>
          </div>
        )}
      </main>

      {showDraw && <DrawAnimation paidNumbers={paidNumbers} onClose={() => setShowDraw(false)} />}
      {showManual && (
        <ManualRegisterModal
          availableNumbers={availableNums}
          pricePerNumber={pricePerNumber}
          onClose={() => setShowManual(false)}
          onSuccess={handleManualSuccess}
        />
      )}
    </div>
  );
}
