-- =====================================================================
-- 002: rasmlar uchun YOPIQ (private) bucket. Har qanday rasm formati qabul qilinadi.
-- Fayl yo'li: <user_id>/<akkaunt_id>/<fayl>  -> birinchi papka = egasi
-- Idempotent.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('acc-images', 'acc-images', false)
on conflict (id) do nothing;

-- Formatga cheklov yo'q (JPG, PNG, WEBP, HEIC, AVIF...), bitta fayl 25 MB gacha.
update storage.buckets
   set public = false,
       file_size_limit = 26214400,
       allowed_mime_types = null
 where id = 'acc-images';

drop policy if exists "img_select" on storage.objects;
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_delete" on storage.objects;

create policy "img_select" on storage.objects for select to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
