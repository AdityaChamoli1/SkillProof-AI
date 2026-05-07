ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS parsed_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS file_size integer;

CREATE INDEX IF NOT EXISTS idx_resumes_user_file_hash ON public.resumes (user_id, file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resumes_status_created ON public.resumes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_user_created ON public.certificates (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_file_hash ON public.certificates (file_hash) WHERE file_hash IS NOT NULL;