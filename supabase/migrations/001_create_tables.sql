
-- Este script crea las tablas necesarias para NexusAI
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text,
  user_email text,
  plan text DEFAULT 'premium',
  amount numeric DEFAULT 9.99,
  status text DEFAULT 'pending',
  paypal_ref text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source text,
  amount numeric,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='all_access_subscriptions') THEN
    CREATE POLICY all_access_subscriptions ON subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='revenue' AND policyname='all_access_revenue') THEN
    CREATE POLICY all_access_revenue ON revenue FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
