-- Create public-assets bucket for generic site assets
insert into storage.buckets (id, name, public) 
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Public read access
create policy "Public Access to site assets"
on storage.objects for select
to public
using ( bucket_id = 'public-assets' );

-- Admin full access (Assuming the same logic as other admin policies, using public.profiles)
create policy "Admin Insert Access to site assets"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'public-assets' 
    and exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    )
);

create policy "Admin Update Access to site assets"
on storage.objects for update
to authenticated
using (
    bucket_id = 'public-assets' 
    and exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    )
);

create policy "Admin Delete Access to site assets"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'public-assets' 
    and exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    )
);
