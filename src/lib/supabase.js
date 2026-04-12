import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variáveis de ambiente do Supabase não configuradas.\n' +
    'Crie um arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=sua_url_aqui\n' +
    'VITE_SUPABASE_ANON_KEY=sua_chave_aqui'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Helper functions ──────────────────────────────────────────────────────

/**
 * Load all 240 numbers with their current status
 */
export async function fetchNumbers() {
  const { data, error } = await supabase
    .from('raffle_numbers')
    .select('number, status, reservation_id')
    .order('number');

  if (error) throw error;
  return data;
}

/**
 * Load app settings (couple name, draw date, price, pix key)
 */
export async function fetchSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');

  if (error) throw error;

  return Object.fromEntries(data.map((s) => [s.key, s.value]));
}

/**
 * Call the transactional create_reservation database function.
 * Returns the new reservation ID or throws on conflict.
 */
export async function createReservation({ buyerName, buyerWhatsapp, buyerEmail, numbers, pricePerNumber }) {
  const { data, error } = await supabase.rpc('create_reservation', {
    p_buyer_name: buyerName,
    p_buyer_whatsapp: buyerWhatsapp,
    p_buyer_email: buyerEmail || null,
    p_numbers: numbers,
    p_price_per_number: pricePerNumber,
  });

  if (error) throw error;
  return data; // UUID of the new reservation
}

/**
 * Admin: fetch all reservations with optional status filter
 */
export async function fetchReservations(statusFilter = null) {
  let query = supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Admin: confirm a pending reservation (marks as confirmed + numbers as paid)
 */
export async function confirmReservation(reservationId) {
  const { error } = await supabase.rpc('confirm_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw error;
}

/**
 * Admin: cancel a reservation and free the numbers
 */
export async function cancelReservation(reservationId) {
  const { error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw error;
}

/**
 * Admin: update a setting value
 */
export async function updateSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

/**
 * Admin: manually register numbers as paid (for offline buyers)
 * Creates a confirmed reservation directly, bypassing the pending step.
 */
export async function adminRegisterNumbers({ buyerName, buyerWhatsapp, buyerEmail, numbers, pricePerNumber }) {
  const { data, error } = await supabase.rpc('admin_register_numbers', {
    p_buyer_name: buyerName,
    p_buyer_whatsapp: buyerWhatsapp,
    p_buyer_email: buyerEmail || null,
    p_numbers: numbers,
    p_price_per_number: pricePerNumber,
  });
  if (error) throw error;
  return data;
}

/**
 * Admin: get dashboard stats
 */
export async function fetchStats() {
  const [numbersRes, reservationsRes, settingsRes] = await Promise.all([
    supabase.from('raffle_numbers').select('status'),
    supabase.from('reservations').select('total_value, status'),
    fetchSettings(),
  ]);

  if (numbersRes.error) throw numbersRes.error;
  if (reservationsRes.error) throw reservationsRes.error;

  const numbers = numbersRes.data;
  const reservations = reservationsRes.data;

  const available = numbers.filter((n) => n.status === 'available').length;
  const reserved = numbers.filter((n) => n.status === 'reserved').length;
  const paid = numbers.filter((n) => n.status === 'paid').length;

  const totalCollected = reservations
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + parseFloat(r.total_value), 0);

  const pendingValue = reservations
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.total_value), 0);

  return {
    available,
    reserved,
    paid,
    total: numbers.length,
    totalCollected,
    pendingValue,
    settings: settingsRes,
  };
}
