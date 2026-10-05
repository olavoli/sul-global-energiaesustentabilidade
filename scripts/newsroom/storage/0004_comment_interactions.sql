ALTER TABLE public_comments ADD COLUMN parent_comment_id TEXT REFERENCES public_comments(id) ON DELETE RESTRICT;
ALTER TABLE public_comments ADD COLUMN root_comment_id TEXT REFERENCES public_comments(id) ON DELETE RESTRICT
  CHECK ((parent_comment_id IS NULL AND root_comment_id IS NULL) OR
    (parent_comment_id IS NOT NULL AND root_comment_id IS NOT NULL AND parent_comment_id <> id AND root_comment_id <> id));
ALTER TABLE public_comments ADD COLUMN published_at TEXT
  CHECK (published_at IS NULL OR (created_at <= published_at AND published_at <= updated_at));
UPDATE public_comments SET published_at=approved_at WHERE status='approved' AND published_at IS NULL;
CREATE INDEX public_comments_article_published ON public_comments(article_slug,status,root_comment_id,published_at,id);
CREATE INDEX public_comments_root_published ON public_comments(root_comment_id,status,published_at,id);
CREATE INDEX public_comments_parent ON public_comments(parent_comment_id);
CREATE TABLE comment_reactions (
  comment_id TEXT NOT NULL REFERENCES public_comments(id) ON DELETE RESTRICT,
  visitor_hash TEXT NOT NULL CHECK (length(visitor_hash)=64 AND visitor_hash NOT GLOB '*[^0-9a-f]*'),
  value TEXT NOT NULL CHECK (value IN ('like','dislike')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL CHECK (created_at <= updated_at),
  PRIMARY KEY (comment_id,visitor_hash)
);
CREATE INDEX comment_reactions_counts ON comment_reactions(comment_id,value);
CREATE TABLE comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES public_comments(id) ON DELETE RESTRICT,
  visitor_hash TEXT NOT NULL CHECK (length(visitor_hash)=64 AND visitor_hash NOT GLOB '*[^0-9a-f]*'),
  reason TEXT NOT NULL CHECK (reason IN ('spam','abuso','privacidade','outro')),
  detail TEXT CHECK (detail IS NULL OR length(detail) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT CHECK (reviewed_by IS NULL OR length(trim(reviewed_by)) BETWEEN 1 AND 128),
  CHECK ((status='open' AND reviewed_at IS NULL AND reviewed_by IS NULL) OR
    (status IN ('reviewed','dismissed') AND reviewed_at IS NOT NULL AND reviewed_at >= created_at AND reviewed_by IS NOT NULL)),
  UNIQUE (comment_id,visitor_hash)
);
CREATE INDEX comment_reports_status_created ON comment_reports(status,created_at,id);
CREATE INDEX comment_reports_comment ON comment_reports(comment_id);
