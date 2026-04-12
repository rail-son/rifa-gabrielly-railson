-- ============================================================
--  Rifa de Casamento — Gabrielly & Railson
--  Supabase / PostgreSQL Schema
--  Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ── 1. SETTINGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default values
INSERT INTO settings (key, value) VALUES
  ('couple_name',       'Gabrielly & Railson'),
  ('draw_date',         '2026-08-10'),
  ('price_per_number',  '20'),
  ('pix_key',           '+5534991737875'),
  ('total_numbers',     '240')
ON CONFLICT (key) DO NOTHING;


-- ── 2. RESERVATIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_name       TEXT        NOT NULL,
  buyer_whatsapp   TEXT        NOT NULL,
  buyer_email      TEXT,
  numbers          INTEGER[]   NOT NULL,
  total_value      NUMERIC(10, 2) NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 3. RAFFLE NUMBERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raffle_numbers (
  number          INTEGER PRIMARY KEY CHECK (number >= 1 AND number <= 240),
  status          TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available', 'reserved', 'paid')),
  reservation_id  UUID REFERENCES reservations(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all 240 numbers
INSERT INTO raffle_numbers (number)
SELECT generate_series(1, 240)
ON CONFLICT (number) DO NOTHING;

-- Auto-update updated_at on raffle_numbers
DROP TRIGGER IF EXISTS raffle_numbers_updated_at ON raffle_numbers;
CREATE TRIGGER raffle_numbers_updated_at
  BEFORE UPDATE ON raffle_numbers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 4. TRANSACTIONAL FUNCTIONS ───────────────────────────────────────────

-- create_reservation: atomic reservation with conflict detection
CREATE OR REPLACE FUNCTION create_reservation(
  p_buyer_name       TEXT,
  p_buyer_whatsapp   TEXT,
  p_buyer_email      TEXT,
  p_numbers          INTEGER[],
  p_price_per_number NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id UUID;
  v_unavailable    INTEGER[];
  v_count          INTEGER;
BEGIN
  -- Validate input
  IF array_length(p_numbers, 1) IS NULL OR array_length(p_numbers, 1) = 0 THEN
    RAISE EXCEPTION 'No numbers provided';
  END IF;

  -- Lock rows to prevent concurrent reservation of same numbers
  PERFORM pg_advisory_xact_lock(hashtext('raffle_reservation'));

  -- Check for already-taken numbers
  SELECT ARRAY_AGG(number) INTO v_unavailable
  FROM raffle_numbers
  WHERE number = ANY(p_numbers)
    AND status != 'available';

  IF v_unavailable IS NOT NULL THEN
    RAISE EXCEPTION 'Numbers already taken: %', v_unavailable;
  END IF;

  -- Create the reservation
  INSERT INTO reservations (
    buyer_name, buyer_whatsapp, buyer_email,
    numbers, total_value, status, expires_at
  ) VALUES (
    p_buyer_name,
    p_buyer_whatsapp,
    p_buyer_email,
    p_numbers,
    array_length(p_numbers, 1) * p_price_per_number,
    'pending',
    NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_reservation_id;

  -- Mark the numbers as reserved
  UPDATE raffle_numbers
  SET status = 'reserved', reservation_id = v_reservation_id
  WHERE number = ANY(p_numbers);

  RETURN v_reservation_id;
END;
$$;


-- confirm_reservation: mark as confirmed and numbers as paid
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numbers INTEGER[];
BEGIN
  -- Get the numbers for this reservation
  SELECT numbers INTO v_numbers
  FROM reservations
  WHERE id = p_reservation_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found or not in pending status';
  END IF;

  -- Update reservation to confirmed
  UPDATE reservations
  SET status = 'confirmed', confirmed_at = NOW()
  WHERE id = p_reservation_id;

  -- Mark numbers as paid
  UPDATE raffle_numbers
  SET status = 'paid'
  WHERE number = ANY(v_numbers) AND reservation_id = p_reservation_id;
END;
$$;


-- cancel_reservation: mark as cancelled and free the numbers
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numbers INTEGER[];
BEGIN
  SELECT numbers INTO v_numbers
  FROM reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  UPDATE reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  -- Free the numbers (only if still reserved by this reservation)
  UPDATE raffle_numbers
  SET status = 'available', reservation_id = NULL
  WHERE reservation_id = p_reservation_id
    AND status = 'reserved';
END;
$$;


-- expire_old_reservations: called periodically to clean up expired pending reservations
-- You can schedule this via Supabase Cron (pg_cron extension) or call it from your app.
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_ids UUID[];
  v_count       INTEGER := 0;
BEGIN
  -- Find expired pending reservations
  SELECT ARRAY_AGG(id) INTO v_expired_ids
  FROM reservations
  WHERE status = 'pending'
    AND expires_at < NOW();

  IF v_expired_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Free the numbers
  UPDATE raffle_numbers
  SET status = 'available', reservation_id = NULL
  WHERE reservation_id = ANY(v_expired_ids)
    AND status = 'reserved';

  -- Cancel the reservations
  UPDATE reservations
  SET status = 'cancelled'
  WHERE id = ANY(v_expired_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations   ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "public_read_settings"         ON settings;
DROP POLICY IF EXISTS "public_read_numbers"          ON raffle_numbers;
DROP POLICY IF EXISTS "public_read_own_reservation"  ON reservations;
DROP POLICY IF EXISTS "admin_all_settings"           ON settings;
DROP POLICY IF EXISTS "admin_all_numbers"            ON raffle_numbers;
DROP POLICY IF EXISTS "admin_all_reservations"       ON reservations;

-- Public: read-only on settings and numbers
CREATE POLICY "public_read_settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "public_read_numbers"
  ON raffle_numbers FOR SELECT
  USING (true);

-- Public: read own reservation by id (used after payment to show timer)
CREATE POLICY "public_read_own_reservation"
  ON reservations FOR SELECT
  USING (true);  -- Simplified; tighten in production if needed

-- Admin (authenticated users): full access to all tables
CREATE POLICY "admin_all_settings"
  ON settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_numbers"
  ON raffle_numbers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_reservations"
  ON reservations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 6. REALTIME ───────────────────────────────────────────────────────────
-- Enable Realtime for raffle_numbers so frontend updates live
-- Run in Supabase Dashboard → Database → Replication, or:

ALTER PUBLICATION supabase_realtime ADD TABLE raffle_numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;


-- ── 7. OPTIONAL: pg_cron for auto-expiry ─────────────────────────────────
-- If pg_cron is enabled in your Supabase project (Database → Extensions):
-- 
-- SELECT cron.schedule(
--   'expire-reservations',
--   '*/5 * * * *',   -- every 5 minutes
--   $$SELECT expire_old_reservations();$$
-- );
--
-- To unschedule: SELECT cron.unschedule('expire-reservations');


-- ── 8. INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_raffle_numbers_status   ON raffle_numbers (status);
CREATE INDEX IF NOT EXISTS idx_raffle_numbers_res_id   ON raffle_numbers (reservation_id);

-- ── Done! ─────────────────────────────────────────────────────────────────
-- After running this schema:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add User
--    to create your admin account
-- 2. Copy .env.example to .env and fill in your Supabase URL and anon key
-- 3. npm install && npm run dev


-- ── 9. ADMIN MANUAL REGISTRATION ─────────────────────────────────────────
-- Registers numbers directly as paid (confirmed), bypassing the pending step.
-- Used by the admin for buyers who paid outside the site (cash, direct transfer, etc.)
CREATE OR REPLACE FUNCTION admin_register_numbers(
  p_buyer_name       TEXT,
  p_buyer_whatsapp   TEXT,
  p_buyer_email      TEXT,
  p_numbers          INTEGER[],
  p_price_per_number NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id UUID;
  v_unavailable    INTEGER[];
BEGIN
  IF array_length(p_numbers, 1) IS NULL OR array_length(p_numbers, 1) = 0 THEN
    RAISE EXCEPTION 'No numbers provided';
  END IF;

  -- Prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('raffle_reservation'));

  -- Check for unavailable numbers
  SELECT ARRAY_AGG(number) INTO v_unavailable
  FROM raffle_numbers
  WHERE number = ANY(p_numbers)
    AND status != 'available';

  IF v_unavailable IS NOT NULL THEN
    RAISE EXCEPTION 'Numbers already taken: %', v_unavailable;
  END IF;

  -- Create reservation already confirmed (no pending step)
  INSERT INTO reservations (
    buyer_name, buyer_whatsapp, buyer_email,
    numbers, total_value, status, expires_at, confirmed_at
  ) VALUES (
    p_buyer_name,
    p_buyer_whatsapp,
    p_buyer_email,
    p_numbers,
    array_length(p_numbers, 1) * p_price_per_number,
    'confirmed',       -- directly confirmed
    NULL,              -- no expiry needed
    NOW()
  )
  RETURNING id INTO v_reservation_id;

  -- Mark numbers as paid immediately
  UPDATE raffle_numbers
  SET status = 'paid', reservation_id = v_reservation_id
  WHERE number = ANY(p_numbers);

  RETURN v_reservation_id;
END;
$$;
