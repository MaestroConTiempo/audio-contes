-- Bloque 1: columnas + indices
ALTER TABLE stories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

ALTER TABLE audios ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_audios_user_id ON audios(user_id);

-- Bloque 2: RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;

-- Bloque 3: policies stories
CREATE POLICY "Users can read their stories"
ON stories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their stories"
ON stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their stories"
ON stories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their stories"
ON stories FOR DELETE
USING (auth.uid() = user_id);

-- Bloque 4: policies audios
CREATE POLICY "Users can read their audios"
ON audios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their audios"
ON audios FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their audios"
ON audios FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their audios"
ON audios FOR DELETE
USING (auth.uid() = user_id);

-- Bloque 5: profiles (opcional, pagos futuros)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan_status TEXT DEFAULT 'inactive',
  payment_provider TEXT,
  subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
