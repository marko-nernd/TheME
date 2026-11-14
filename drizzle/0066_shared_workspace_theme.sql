-- Bring untouched legacy theme defaults in line with the admin workspace.
-- Keep explicitly customized brand colors and sizes unchanged.
ALTER TABLE site_brand_settings ALTER COLUMN dark_color SET DEFAULT '#141519';
--> statement-breakpoint
UPDATE site_brand_settings SET dark_color = '#141519' WHERE dark_color = '#0b0b0c';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN muted_color SET DEFAULT '#a7a9b6';
--> statement-breakpoint
UPDATE site_brand_settings SET muted_color = '#a7a9b6' WHERE muted_color = '#a7a7af';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN heading_color SET DEFAULT '#f1f2f6';
--> statement-breakpoint
UPDATE site_brand_settings SET heading_color = '#f1f2f6' WHERE heading_color = '#ff2d95';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN body_text_color SET DEFAULT '#f1f2f6';
--> statement-breakpoint
UPDATE site_brand_settings SET body_text_color = '#f1f2f6' WHERE body_text_color = '#f2f2f4';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN header_background_color SET DEFAULT '#191a20';
--> statement-breakpoint
UPDATE site_brand_settings SET header_background_color = '#191a20' WHERE header_background_color = '#0b0b0c';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN surface_color SET DEFAULT '#202127';
--> statement-breakpoint
UPDATE site_brand_settings SET surface_color = '#202127' WHERE surface_color = '#151517';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN input_background_color SET DEFAULT '#17181d';
--> statement-breakpoint
UPDATE site_brand_settings SET input_background_color = '#17181d' WHERE input_background_color = '#1b1b1f';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN input_text_color SET DEFAULT '#f1f2f6';
--> statement-breakpoint
UPDATE site_brand_settings SET input_text_color = '#f1f2f6' WHERE input_text_color = '#f2f2f4';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN border_color SET DEFAULT '#34353f';
--> statement-breakpoint
UPDATE site_brand_settings SET border_color = '#34353f' WHERE border_color = '#34343a';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN button_radius SET DEFAULT '8';
--> statement-breakpoint
UPDATE site_brand_settings SET button_radius = '8' WHERE button_radius = '0';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN dropdown_background_color SET DEFAULT '#202127';
--> statement-breakpoint
UPDATE site_brand_settings SET dropdown_background_color = '#202127' WHERE dropdown_background_color = '#1a1a18';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN heading_xl_size SET DEFAULT '48';
--> statement-breakpoint
UPDATE site_brand_settings SET heading_xl_size = '48' WHERE heading_xl_size = '72';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN heading_lg_size SET DEFAULT '40';
--> statement-breakpoint
UPDATE site_brand_settings SET heading_lg_size = '40' WHERE heading_lg_size = '48';
--> statement-breakpoint
ALTER TABLE site_brand_settings ALTER COLUMN heading_md_size SET DEFAULT '24';
--> statement-breakpoint
UPDATE site_brand_settings SET heading_md_size = '24' WHERE heading_md_size = '28';
--> statement-breakpoint
