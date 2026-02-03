ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generation_error text,
ADD COLUMN IF NOT EXISTS generated_at timestamptz;

CREATE INDEX IF NOT EXISTS stories_user_status_idx
ON public.stories (user_id, status);

CREATE TABLE IF NOT EXISTS public.story_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS story_jobs_story_id_idx
ON public.story_jobs (story_id);

CREATE INDEX IF NOT EXISTS story_jobs_status_idx
ON public.story_jobs (status);

ALTER TABLE public.audios
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generation_error text,
ADD COLUMN IF NOT EXISTS generated_at timestamptz;
