-- Add "Nama-Marketing" column to "laporan" table
alter table public.laporan
add column "Nama-Marketing" text;

-- Optional: Update existing rows to have a default marketing name if needed
-- update public.laporan set "Nama-Marketing" = 'Default Marketing' where "Nama-Marketing" is null;
