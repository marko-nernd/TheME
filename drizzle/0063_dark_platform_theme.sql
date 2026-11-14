-- Presentation settings only. Preserve identity, logos, media, typography and all member/event data.
UPDATE site_brand_settings SET
  dark_color = '#0b0b0c', header_background_color = '#0b0b0c', header_text_color = '#ffffff',
  body_text_color = '#f2f2f4', heading_color = primary_color, muted_color = '#a7a7af',
  surface_color = '#151517', input_background_color = '#1b1b1f', input_text_color = '#f2f2f4',
  border_color = '#34343a', link_color = '#ff72b8', updated_at = now()
WHERE id = 'default';
ALTER TABLE site_brand_settings ALTER COLUMN dark_color SET DEFAULT '#0b0b0c';
ALTER TABLE site_brand_settings ALTER COLUMN header_background_color SET DEFAULT '#0b0b0c';
ALTER TABLE site_brand_settings ALTER COLUMN body_text_color SET DEFAULT '#f2f2f4';
ALTER TABLE site_brand_settings ALTER COLUMN heading_color SET DEFAULT '#ff2d95';
ALTER TABLE site_brand_settings ALTER COLUMN muted_color SET DEFAULT '#a7a7af';
ALTER TABLE site_brand_settings ALTER COLUMN surface_color SET DEFAULT '#151517';
ALTER TABLE site_brand_settings ALTER COLUMN input_background_color SET DEFAULT '#1b1b1f';
ALTER TABLE site_brand_settings ALTER COLUMN input_text_color SET DEFAULT '#f2f2f4';
ALTER TABLE site_brand_settings ALTER COLUMN border_color SET DEFAULT '#34343a';
ALTER TABLE site_brand_settings ALTER COLUMN link_color SET DEFAULT '#ff72b8';
