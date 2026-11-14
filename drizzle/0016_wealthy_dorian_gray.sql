CREATE TABLE "collaboration_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"sender_member_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_type" text DEFAULT 'image' NOT NULL,
	"media_path" text,
	"media_data" "bytea",
	"media_mime" text,
	"eyebrow" text NOT NULL,
	"title" text NOT NULL,
	"accent_text" text DEFAULT '' NOT NULL,
	"copy" text NOT NULL,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaboration_requests" ADD COLUMN "kind" text DEFAULT 'introduction' NOT NULL;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_request_id_collaboration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."collaboration_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_sender_member_id_members_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collaboration_messages_request_created_idx" ON "collaboration_messages" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "collaboration_messages_sender_idx" ON "collaboration_messages" USING btree ("sender_member_id");--> statement-breakpoint
CREATE INDEX "home_hero_slides_active_order_idx" ON "home_hero_slides" USING btree ("is_active","sort_order");--> statement-breakpoint
INSERT INTO "home_hero_slides"
  ("media_type", "media_path", "eyebrow", "title", "accent_text", "copy", "cta_label", "cta_href", "alt_text", "sort_order")
VALUES
  ('image', '/images/desert-model.jpg', 'A private creative network', 'Make work worth', 'escaping for.', 'Curated destination shoots that bring serious models and photographers together—without the noise, guesswork, or endless DMs.', 'Explore experiences', '/events', 'Creative portrait session in the Arizona desert', 0),
  ('image', '/images/desert-production.png', 'Produced in remarkable places', 'A better crew.', 'A bigger idea.', 'Join small, professionally planned productions with a clear brief, a trusted team, and room to make ambitious work.', 'Meet the community', '/discover', 'Creative production team at a modern Arizona house', 1),
  ('image', '/images/neon-studio.png', 'Studio to destination', 'Build the frame.', 'Own the night.', 'From controlled studio sessions to destination editorials, every escape is designed around portfolio-defining outcomes.', 'Browse the gallery', '/gallery', 'Professional fashion photography production in a neon studio', 2),
  ('image', '/images/creative-planning.png', 'For people who make things happen', 'Bring the vision.', 'We’ll build the plan.', 'Organizers, promoters, and model-led teams can propose funded experiences and work with us from feasibility through launch.', 'Host an event', '/host', 'Event producers planning on a Scottsdale rooftop', 3),
  ('image', '/images/poolside-network.png', 'Connection without the algorithm', 'The right room.', 'The right people.', 'Meet verified creatives through focused gatherings where introductions become collaborations and collaborations become real work.', 'Discover members', '/discover', 'Creative professionals networking at a desert resort', 4),
  ('image', '/images/daisy.jpg', 'Portfolio-first experiences', 'Leave with work', 'you believe in.', 'Considered locations, production support, and serious collaborators—so the time away produces more than a camera roll.', 'See membership', '/membership', 'Editorial portrait created during a destination session', 5),
  ('image', '/images/scottsdale.jpg', 'Built on trust', 'Smaller network.', 'Stronger signal.', 'Every profile is reviewed, every experience is scoped, and every collaboration starts with clear expectations.', 'Read our story', '/about', 'Model Escape editorial portrait in Scottsdale', 6);
