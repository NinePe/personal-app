-- PENDING TRANSACTIONS — gastos e ingresos por procesar desde WhatsApp + AI
CREATE TABLE IF NOT EXISTS spending.pending_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount           numeric(12,2),
  description      text,
  category_name    text,
  subcategory_name text,
  payment_method   text,
  place_name       text,
  place_address    text,
  transaction_date date,
  notes            text,
  raw_message      text,
  raw_audio_url    text,
  is_split         boolean DEFAULT false,
  split_people     jsonb,
  status           text DEFAULT 'pending' CHECK (status IN ('pending','approved','ignored')),
  created_at       timestamptz DEFAULT now()
);
