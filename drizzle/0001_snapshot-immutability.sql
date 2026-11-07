CREATE FUNCTION reject_article_version_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Article snapshots are immutable' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER article_versions_immutable
BEFORE UPDATE ON article_versions
FOR EACH ROW EXECUTE FUNCTION reject_article_version_update();
