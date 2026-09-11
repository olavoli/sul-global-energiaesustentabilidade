CREATE TABLE IF NOT EXISTS public_comments (
  id TEXT PRIMARY KEY,
  article_slug TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'approved', 'rejected', 'spam', 'deleted')
  ),
  public_name TEXT,
  email_normalized TEXT,
  email_hash TEXT NOT NULL CHECK (
    length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'
  ),
  body_text TEXT,
  consent_version TEXT NOT NULL CHECK (consent_version = 'comments-v1'),
  consented_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT,
  deleted_at TEXT,
  anonymized_at TEXT,
  CHECK (
    (public_name IS NOT NULL AND email_normalized IS NOT NULL AND body_text IS NOT NULL)
    OR
    (public_name IS NULL AND email_normalized IS NULL AND body_text IS NULL)
  ),
  CHECK (
    (
      status = 'pending'
      AND public_name IS NOT NULL
      AND approved_at IS NULL AND rejected_at IS NULL AND deleted_at IS NULL
      AND anonymized_at IS NULL
    )
    OR
    (
      status = 'approved'
      AND public_name IS NOT NULL
      AND approved_at IS NOT NULL AND rejected_at IS NULL AND deleted_at IS NULL
      AND anonymized_at IS NULL
    )
    OR
    (
      status IN ('rejected', 'spam')
      AND rejected_at IS NOT NULL AND approved_at IS NULL AND deleted_at IS NULL
      AND (
        (public_name IS NOT NULL AND anonymized_at IS NULL)
        OR
        (public_name IS NULL AND anonymized_at IS NOT NULL)
      )
    )
    OR
    (
      status = 'deleted'
      AND public_name IS NULL
      AND approved_at IS NULL AND rejected_at IS NULL AND deleted_at IS NOT NULL
      AND anonymized_at IS NOT NULL
    )
  ),
  CHECK (consented_at <= created_at AND created_at <= updated_at),
  CHECK (approved_at IS NULL OR (created_at <= approved_at AND approved_at <= updated_at)),
  CHECK (rejected_at IS NULL OR (created_at <= rejected_at AND rejected_at <= updated_at)),
  CHECK (deleted_at IS NULL OR (created_at <= deleted_at AND deleted_at <= updated_at)),
  CHECK (
    anonymized_at IS NULL OR (
      created_at <= anonymized_at
      AND anonymized_at <= updated_at
      AND (rejected_at IS NULL OR rejected_at <= anonymized_at)
      AND (deleted_at IS NULL OR deleted_at <= anonymized_at)
    )
  )
);

CREATE INDEX IF NOT EXISTS public_comments_article_status_approved
  ON public_comments(article_slug, status, approved_at, id);
CREATE INDEX IF NOT EXISTS public_comments_status_created
  ON public_comments(status, created_at);
CREATE INDEX IF NOT EXISTS public_comments_email_hash
  ON public_comments(email_hash);

CREATE TABLE IF NOT EXISTS comment_moderation_events (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'spam', 'delete')),
  actor TEXT NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 128),
  reason TEXT CHECK (reason IS NULL OR length(reason) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL,
  FOREIGN KEY (comment_id) REFERENCES public_comments(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS comment_moderation_events_comment_created
  ON comment_moderation_events(comment_id, created_at);
CREATE INDEX IF NOT EXISTS comment_moderation_events_actor_created
  ON comment_moderation_events(actor, created_at);
