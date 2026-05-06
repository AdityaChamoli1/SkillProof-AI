
insert into storage.buckets (id, name, public) values ('certificates', 'certificates', false)
on conflict (id) do nothing;

create policy "Users read own certificate files"
on storage.objects for select to authenticated
using (bucket_id = 'certificates' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload own certificate files"
on storage.objects for insert to authenticated
with check (bucket_id = 'certificates' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own certificate files"
on storage.objects for update to authenticated
using (bucket_id = 'certificates' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own certificate files"
on storage.objects for delete to authenticated
using (bucket_id = 'certificates' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Recruiters and admins read certificate files"
on storage.objects for select to authenticated
using (bucket_id = 'certificates' and (public.has_role(auth.uid(),'recruiter') or public.has_role(auth.uid(),'admin')));

create index if not exists idx_certificates_file_hash on public.certificates(file_hash);
create index if not exists idx_resumes_user on public.resumes(user_id);
