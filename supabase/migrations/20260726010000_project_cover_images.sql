alter table public.projects
  add column image_url text
  check (image_url is null or char_length(image_url) between 1 and 2048);

comment on column public.projects.image_url is
  'Optional project cover image URL. A null value uses the application fallback artwork.';
