-- ═══════════════════════════════════════════════════════════════════════════
--  GDC LAKARAI — ONE-TIME DATABASE UPGRADE (October 2026 update)
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query → paste → Run
--  It is safe to run multiple times (everything uses IF NOT EXISTS).
--
--  What it adds:
--   1. New admin-managed CONTACT fields on school_settings
--      (office hours, secondary phone, WhatsApp, Facebook page, contact note)
--   2. A new `programs` table so the admin panel can fully control the
--      public /programs page (titles, subjects, requirements, contacts…)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Contact information block (Admin → College Settings → Contact Information)
--    Every column is optional — leave a field empty in the admin panel and it
--    simply disappears from the public Contact page / footer.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.school_settings
  add column if not exists office_hours     text;
alter table public.school_settings
  add column if not exists secondary_phone  text;
alter table public.school_settings
  add column if not exists whatsapp_number  text;
alter table public.school_settings
  add column if not exists facebook_url     text;
alter table public.school_settings
  add column if not exists contact_note     text;

-- 1b) Access code for the bulk "Report Card" tool on the Results page.
--     Manage it from the admin dashboard (College Settings). If left empty
--     the site falls back to the neutral default code "GDC-LAKARAI".
--     ⚠ This is a convenience gate, not a security boundary — student data
--     itself is protected by Supabase RLS policies, not by this code.
alter table public.school_settings
  add column if not exists report_card_access_code text;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Programs table (Admin → Manage Programs & Subjects)
--    subject_groups example value (JSONB):
--    [
--      { "label": "1st Year (Part-I)",  "subjects": ["English", "Physics"] },
--      { "label": "2nd Year (Part-II)", "subjects": ["English", "Physics"] }
--    ]
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.programs (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  category             text not null default 'intermediate'
                         check (category in ('intermediate', 'bs', 'ad')),
  title                text not null,
  short_name           text,
  duration             text,
  tagline              text,
  description          text,
  subject_groups       jsonb default '[]'::jsonb,
  career_paths         jsonb default '[]'::jsonb,
  admission_requirement text,
  contact_info         text,
  is_active            boolean default true,
  sort_order           integer default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Public visitors can read programs; only signed-in admins can change them.
-- (Same access pattern as the rest of the site.)
alter table public.programs enable row level security;

drop policy if exists "Public read programs" on public.programs;
create policy "Public read programs"
  on public.programs for select
  using (true);

drop policy if exists "Admins insert programs" on public.programs;
create policy "Admins insert programs"
  on public.programs for insert
  to authenticated
  with check (true);

drop policy if exists "Admins update programs" on public.programs;
create policy "Admins update programs"
  on public.programs for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins delete programs" on public.programs;
create policy "Admins delete programs"
  on public.programs for delete
  to authenticated
  using (true);

-- Keep updated_at fresh automatically
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.touch_updated_at();

-- Done! Nothing else to configure.
