CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Recruiters and admins can view resumes" ON public.resumes;
CREATE POLICY "Recruiters and admins can view resumes"
ON public.resumes
FOR SELECT
USING (private.has_role(auth.uid(), 'recruiter'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Recruiters and admins read resumes bucket" ON storage.objects;
CREATE POLICY "Recruiters and admins read resumes bucket"
ON storage.objects
FOR SELECT
USING ((bucket_id = 'resumes'::text) AND (private.has_role(auth.uid(), 'recruiter'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "Recruiters and admins read certificate files" ON storage.objects;
CREATE POLICY "Recruiters and admins read certificate files"
ON storage.objects
FOR SELECT
USING ((bucket_id = 'certificates'::text) AND (private.has_role(auth.uid(), 'recruiter'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);