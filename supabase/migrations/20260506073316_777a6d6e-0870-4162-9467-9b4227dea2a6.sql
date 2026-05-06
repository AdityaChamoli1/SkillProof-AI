insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict (id) do nothing;

create policy "Users upload own resume files"
on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own resume files"
on storage.objects for select to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own resume files"
on storage.objects for update to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own resume files"
on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Recruiters and admins read resumes bucket"
on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (public.has_role(auth.uid(), 'recruiter') or public.has_role(auth.uid(), 'admin')));