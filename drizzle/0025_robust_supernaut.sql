ALTER TABLE "sponsors" ADD COLUMN "contact_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "contact_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "sponsor_level" text DEFAULT 'Partner' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "preferred_placement" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "preferred_logo_size" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "brand_guidelines" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "logo_usage_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "sponsorship_starts_on" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "sponsorship_ends_on" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "required_wording" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "tracking_url" text;--> statement-breakpoint
UPDATE "sponsors"
SET
  "contact_name" = CASE "slug"
    WHEN 'fhm' THEN 'Jordan Lee'
    WHEN 'glow-beauty-labs' THEN 'Camila Torres'
    WHEN 'vista-resorts' THEN 'Morgan Reed'
    WHEN 'apex-camera-co' THEN 'Avery Brooks'
    ELSE "name" || ' Partnerships'
  END,
  "contact_phone" = CASE "slug"
    WHEN 'fhm' THEN '+1 305 555 0140'
    WHEN 'glow-beauty-labs' THEN '+1 305 555 0184'
    WHEN 'vista-resorts' THEN '+1 305 555 0128'
    WHEN 'apex-camera-co' THEN '+1 602 555 0172'
    ELSE ''
  END,
  "sponsor_level" = CASE "slug"
    WHEN 'fhm' THEN 'Diamond'
    WHEN 'glow-beauty-labs' THEN 'Gold'
    WHEN 'vista-resorts' THEN 'Platinum'
    WHEN 'apex-camera-co' THEN 'Silver'
    ELSE 'Partner'
  END,
  "preferred_placement" = CASE "slug"
    WHEN 'fhm' THEN 'Featured media partner, event hero, and press wall'
    WHEN 'glow-beauty-labs' THEN 'Beauty preparation area and event gallery'
    WHEN 'vista-resorts' THEN 'Destination and venue sections'
    WHEN 'apex-camera-co' THEN 'Photographer area and production credits'
    ELSE 'Event sponsor area'
  END,
  "preferred_logo_size" = 'Equal partner sizing; preserve clear space around logo',
  "brand_guidelines" = 'Use the supplied full-color logo on a neutral background. Do not stretch, recolor, crop, or add effects.',
  "logo_usage_approved" = true,
  "sponsorship_starts_on" = '2026-07-01',
  "sponsorship_ends_on" = '2027-06-30',
  "required_wording" = CASE WHEN "slug" = 'fhm' THEN 'Featured media partner: FHM.' ELSE 'Official Model Escape event partner.' END,
  "tracking_url" = "website_url";
