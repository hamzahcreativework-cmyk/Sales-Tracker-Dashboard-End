INSERT INTO site_settings (key, value) VALUES ('calendar_bg_video_urls', '[]') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('calendar_date_range', '{"startMonth":1,"startYear":2025,"endMonth":12,"endYear":2026}') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('calendar_bg_music_urls', '[]') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('calendar_fonts', '{"heading":"Orbitron","body":"Poppins"}') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('calendar_logo_url', '') ON CONFLICT (key) DO NOTHING;
