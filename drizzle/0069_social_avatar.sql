ALTER TABLE members ADD COLUMN avatar_source text NOT NULL DEFAULT 'upload', ADD COLUMN social_avatar_data bytea, ADD COLUMN social_avatar_provider text, ADD COLUMN social_avatar_handle text;
