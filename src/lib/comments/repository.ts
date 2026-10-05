import {
  COMMENTS_CONSENT_VERSION,
  commentModerationActionSchema,
  commentStatusSchema,
  persistedCommentSchema,
  type CommentModerationAction,
  type CommentStatus,
  type PersistedComment,
  type ReactionValue,
  type ReportInput,
} from "./contracts";
import type { D1Database, D1PreparedStatement } from "../../../scripts/newsroom/storage/d1-types";

const PUBLIC_LIMIT_MAX = 50;
const MODERATION_LIMIT_MAX = 100;
const DEFAULT_LIMIT = 20;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

interface CommentRow {
  id: string;
  article_slug: string;
  status: string;
  public_name: string | null;
  email_normalized: string | null;
  email_hash: string;
  body_text: string | null;
  consent_version: string;
  consented_at: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  deleted_at: string | null;
  anonymized_at: string | null;
  parent_comment_id?: string | null;
  root_comment_id?: string | null;
  published_at?: string | null;
}

export interface PublicComment {
  id: string;
  publicName: string;
  bodyText: string;
  approvedAt: string;
  publishedAt: string;
  parentCommentId: string | null;
  rootCommentId: string | null;
  replyingTo: string | null;
  likes: number;
  dislikes: number;
  viewerReaction: ReactionValue | null;
}

export interface CommentPage<T> {
  items: T[];
  cursor?: string;
}

export interface CreatePendingCommentInput {
  articleSlug: string;
  publicName: string;
  emailNormalized: string;
  emailHash: string;
  bodyText: string;
}

export interface ModerationInput {
  commentId: string;
  actor: string;
  reason?: string;
}

export interface PublicCommentRepository {
  createPublishedComment(
    input: CreatePendingCommentInput & { parentCommentId?: string },
  ): Promise<PublicComment>;
  getPublicComment(
    articleSlug: string,
    id: string,
    visitorHash?: string,
  ): Promise<PublicComment | undefined>;
  listReplies(
    articleSlug: string,
    rootId: string,
    options?: { cursor?: string; limit?: number; visitorHash?: string },
  ): Promise<CommentPage<PublicComment>>;
  react(
    articleSlug: string,
    id: string,
    visitorHash: string,
    value: ReactionValue | null,
  ): Promise<PublicComment>;
  report(articleSlug: string, id: string, visitorHash: string, input: ReportInput): Promise<void>;
  listReports(
    status: string,
    options?: { cursor?: string; limit?: number },
  ): ReturnType<D1PublicCommentRepository["listReports"]>;
  reviewReport(id: string, actor: string, status: "reviewed" | "dismissed"): Promise<void>;
  restoreComment(input: ModerationInput): Promise<void>;
  createPendingComment(input: CreatePendingCommentInput): Promise<PersistedComment>;
  listApprovedComments(
    articleSlug: string,
    options?: { cursor?: string; limit?: number; visitorHash?: string },
  ): Promise<CommentPage<PublicComment>>;
  listCommentsForModeration(
    status: CommentStatus,
    options?: { cursor?: string; limit?: number },
  ): Promise<CommentPage<PersistedComment>>;
  getCommentById(id: string): Promise<PersistedComment | undefined>;
  approveComment(input: ModerationInput): Promise<void>;
  rejectComment(input: ModerationInput): Promise<void>;
  markCommentAsSpam(input: ModerationInput): Promise<void>;
  softDeleteAndAnonymize(input: ModerationInput): Promise<void>;
  anonymizeExpiredRejectedOrSpam(actor?: string): Promise<number>;
}

export class CommentTransitionError extends Error {
  constructor() {
    super("Transição de comentário inválida.");
    this.name = "CommentTransitionError";
  }
}

function limit(value: number | undefined, maximum: number): number {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return DEFAULT_LIMIT;
  return Math.min(value as number, maximum);
}

function encodeCursor(timestamp: string, id: string): string {
  return encodeURIComponent(JSON.stringify([timestamp, id]));
}

function decodeCursor(cursor: string | undefined): [string, string] | undefined {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(decodeURIComponent(cursor)) as unknown;
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((part) => typeof part === "string" && part.length > 0)
    ) {
      return [value[0], value[1]];
    }
  } catch {
    // O erro público não deve refletir o valor recebido.
  }
  throw new Error("Cursor de comentários inválido.");
}

function fromRow(row: CommentRow): PersistedComment {
  return persistedCommentSchema.parse({
    id: row.id,
    articleSlug: row.article_slug,
    status: row.status,
    publicName: row.public_name,
    emailNormalized: row.email_normalized,
    emailHash: row.email_hash,
    bodyText: row.body_text,
    consentVersion: row.consent_version,
    consentedAt: row.consented_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    deletedAt: row.deleted_at,
    anonymizedAt: row.anonymized_at,
    parentCommentId: row.parent_comment_id ?? null,
    rootCommentId: row.root_comment_id ?? null,
    publishedAt: row.published_at ?? null,
  });
}

export class D1PublicCommentRepository implements PublicCommentRepository {
  constructor(
    private readonly database: D1Database,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async createPublishedComment(
    input: CreatePendingCommentInput & { parentCommentId?: string },
  ): Promise<PublicComment> {
    const parent = input.parentCommentId
      ? await this.getPublicComment(input.articleSlug, input.parentCommentId)
      : undefined;
    if (input.parentCommentId && !parent) throw new CommentTransitionError();
    const root = parent ? (parent.rootCommentId ?? parent.id) : null;
    const timestamp = this.now().toISOString();
    const id = this.createId();
    const result = await this.database
      .prepare(
        `INSERT INTO public_comments (
      id,article_slug,status,public_name,email_normalized,email_hash,body_text,consent_version,
      consented_at,created_at,updated_at,approved_at,parent_comment_id,root_comment_id,published_at
    ) SELECT ?1,?2,'approved',?3,?4,?5,?6,?7,?8,?8,?8,?8,?9,?10,?8
      WHERE ?9 IS NULL OR EXISTS (
        SELECT 1 FROM public_comments p JOIN public_comments r ON r.id=?10
        WHERE p.id=?9 AND p.article_slug=?2 AND r.article_slug=?2
          AND p.status='approved' AND r.status='approved' AND r.root_comment_id IS NULL
          AND COALESCE(p.root_comment_id,p.id)=r.id
      )`,
      )
      .bind(
        id,
        input.articleSlug,
        input.publicName,
        input.emailNormalized,
        input.emailHash,
        input.bodyText,
        COMMENTS_CONSENT_VERSION,
        timestamp,
        input.parentCommentId ?? null,
        root,
      )
      .run();
    if (result.meta?.changes !== 1) throw new CommentTransitionError();
    const created = await this.getPublicComment(input.articleSlug, id);
    if (!created) throw new CommentTransitionError();
    return created;
  }

  private publicSelect() {
    return `SELECT c.id,c.public_name,c.body_text,c.approved_at,
      COALESCE(c.published_at,c.approved_at) AS published_at,c.parent_comment_id,c.root_comment_id,
      CASE WHEN p.status='approved' THEN p.public_name ELSE NULL END AS replying_to,
      (SELECT COUNT(*) FROM comment_reactions WHERE comment_id=c.id AND value='like') AS likes,
      (SELECT COUNT(*) FROM comment_reactions WHERE comment_id=c.id AND value='dislike') AS dislikes,
      (SELECT value FROM comment_reactions WHERE comment_id=c.id AND visitor_hash=?5) AS viewer_reaction
      FROM public_comments c LEFT JOIN public_comments p ON p.id=c.parent_comment_id`;
  }

  private visible() {
    return `c.status='approved' AND (c.root_comment_id IS NULL OR EXISTS (
      SELECT 1 FROM public_comments r WHERE r.id=c.root_comment_id AND r.status='approved'
        AND r.article_slug=c.article_slug AND r.root_comment_id IS NULL))`;
  }

  private publicRow(row: {
    id: string;
    public_name: string;
    body_text: string;
    approved_at: string;
    published_at?: string;
    parent_comment_id?: string | null;
    root_comment_id?: string | null;
    replying_to?: string | null;
    likes?: number;
    dislikes?: number;
    viewer_reaction?: ReactionValue | null;
  }): PublicComment {
    return {
      id: row.id,
      publicName: row.public_name,
      bodyText: row.body_text,
      approvedAt: row.approved_at,
      publishedAt: row.published_at ?? row.approved_at,
      parentCommentId: row.parent_comment_id ?? null,
      rootCommentId: row.root_comment_id ?? null,
      replyingTo: row.replying_to ?? null,
      likes: row.likes ?? 0,
      dislikes: row.dislikes ?? 0,
      viewerReaction: row.viewer_reaction ?? null,
    };
  }

  async getPublicComment(
    articleSlug: string,
    id: string,
    visitorHash?: string,
  ): Promise<PublicComment | undefined> {
    const row = await this.database
      .prepare(
        `${this.publicSelect()} WHERE c.article_slug=?1 AND c.id=?2
      AND ${this.visible()} AND ?3 IS NULL AND ?4 IS NULL`,
      )
      .bind(articleSlug, id, null, null, visitorHash ?? null)
      .first<Parameters<D1PublicCommentRepository["publicRow"]>[0]>();
    return row ? this.publicRow(row) : undefined;
  }

  async listReplies(
    articleSlug: string,
    rootId: string,
    options: { cursor?: string; limit?: number; visitorHash?: string } = {},
  ) {
    const root = await this.getPublicComment(articleSlug, rootId);
    if (!root || root.rootCommentId) throw new CommentTransitionError();
    return this.publicPage(articleSlug, options, rootId);
  }

  private async publicPage(
    articleSlug: string,
    options: { cursor?: string; limit?: number; visitorHash?: string },
    rootId?: string,
  ): Promise<CommentPage<PublicComment>> {
    const pageLimit = limit(options.limit, PUBLIC_LIMIT_MAX);
    const cursor = decodeCursor(options.cursor);
    const time = "COALESCE(c.published_at,c.approved_at)";
    const direction = rootId ? "ASC" : "DESC";
    const operator = rootId ? ">" : "<";
    const result = await this.database
      .prepare(
        `${this.publicSelect()}
      WHERE c.article_slug=?1 AND ${this.visible()}
      AND ${rootId ? "c.root_comment_id=?6" : "c.root_comment_id IS NULL"}
      AND (?2 IS NULL OR ${time} ${operator} ?2 OR (${time}=?2 AND c.id ${operator} ?3))
      ORDER BY ${time} ${direction},c.id ${direction} LIMIT ?4`,
      )
      .bind(
        articleSlug,
        cursor?.[0] ?? null,
        cursor?.[1] ?? null,
        pageLimit + 1,
        options.visitorHash ?? null,
        ...(rootId ? [rootId] : []),
      )
      .all<Parameters<D1PublicCommentRepository["publicRow"]>[0]>();
    const rows = result.results ?? [];
    const items = rows.slice(0, pageLimit).map((row) => this.publicRow(row));
    return {
      items,
      cursor:
        rows.length > pageLimit && items.length
          ? encodeCursor(items.at(-1)!.publishedAt, items.at(-1)!.id)
          : undefined,
    };
  }

  async react(
    articleSlug: string,
    id: string,
    visitorHash: string,
    value: ReactionValue | null,
  ): Promise<PublicComment> {
    const current = await this.getPublicComment(articleSlug, id);
    if (!current) throw new CommentTransitionError();
    const timestamp = this.now().toISOString();
    const available = `EXISTS (SELECT 1 FROM public_comments c WHERE c.id=?1 AND c.article_slug=?4 AND ${this.visible()})`;
    const mutation = value
      ? this.database
          .prepare(
            `INSERT INTO comment_reactions (comment_id,visitor_hash,value,created_at,updated_at)
      SELECT ?1,?2,?3,?5,?5 WHERE ${available}
      ON CONFLICT(comment_id,visitor_hash) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
          )
          .bind(id, visitorHash, value, articleSlug, timestamp)
      : this.database
          .prepare(
            `DELETE FROM comment_reactions WHERE comment_id=?1 AND visitor_hash=?2
          AND ?3 IS NULL AND ${available}`,
          )
          .bind(id, visitorHash, null, articleSlug);
    const snapshot = this.database
      .prepare(
        `${this.publicSelect()} WHERE c.article_slug=?1 AND c.id=?2
      AND ${this.visible()} AND ?3 IS NULL AND ?4 IS NULL`,
      )
      .bind(articleSlug, id, null, null, visitorHash);
    const results = await this.database.batch([mutation, snapshot]);
    const row = results[1]?.results?.[0] as
      | Parameters<D1PublicCommentRepository["publicRow"]>[0]
      | undefined;
    if (!row) throw new CommentTransitionError();
    return this.publicRow(row);
  }

  async report(
    articleSlug: string,
    id: string,
    visitorHash: string,
    input: ReportInput,
  ): Promise<void> {
    if (!(await this.getPublicComment(articleSlug, id))) throw new CommentTransitionError();
    const result = await this.database
      .prepare(
        `INSERT INTO comment_reports (id,comment_id,visitor_hash,reason,detail,created_at)
      SELECT ?1,?2,?3,?4,?5,?6 WHERE EXISTS (
        SELECT 1 FROM public_comments c WHERE c.id=?2 AND c.article_slug=?7 AND ${this.visible()})
      ON CONFLICT(comment_id,visitor_hash) DO NOTHING`,
      )
      .bind(
        this.createId(),
        id,
        visitorHash,
        input.reason,
        input.detail ?? null,
        this.now().toISOString(),
        articleSlug,
      )
      .run();
    if (result.meta?.changes !== 1) throw new CommentTransitionError();
  }

  async listReports(status: string, options: { cursor?: string; limit?: number } = {}) {
    if (!["open", "reviewed", "dismissed"].includes(status))
      throw new Error("Estado de denúncia inválido.");
    const cursor = decodeCursor(options.cursor);
    const pageLimit = limit(options.limit, MODERATION_LIMIT_MAX);
    const result = await this.database
      .prepare(
        `SELECT r.id,r.comment_id AS commentId,r.reason,r.detail,r.status,
      r.created_at AS createdAt,r.reviewed_at AS reviewedAt,r.reviewed_by AS reviewedBy,
      c.public_name AS publicName,c.body_text AS bodyText,c.article_slug AS articleSlug,
      c.parent_comment_id AS parentCommentId,c.root_comment_id AS rootCommentId,c.status AS commentStatus
      FROM comment_reports r JOIN public_comments c ON c.id=r.comment_id WHERE r.status=?1
      AND (?2 IS NULL OR r.created_at>?2 OR (r.created_at=?2 AND r.id>?3))
      ORDER BY r.created_at ASC,r.id ASC LIMIT ?4`,
      )
      .bind(status, cursor?.[0] ?? null, cursor?.[1] ?? null, pageLimit + 1)
      .all<{
        id: string;
        createdAt: string;
        commentId: string;
        reason: string;
        detail: string | null;
        publicName: string | null;
        bodyText: string | null;
        articleSlug: string;
        parentCommentId: string | null;
        rootCommentId: string | null;
        commentStatus: string;
      }>();
    const rows = result.results ?? [];
    const items = rows.slice(0, pageLimit);
    return {
      items,
      cursor:
        rows.length > pageLimit && items.length
          ? encodeCursor(items.at(-1)!.createdAt, items.at(-1)!.id)
          : undefined,
    };
  }

  async reviewReport(id: string, actor: string, status: "reviewed" | "dismissed") {
    if (!actor.trim() || actor.length > 128) throw new CommentTransitionError();
    const result = await this.database
      .prepare(
        `UPDATE comment_reports SET status=?1,reviewed_at=?2,reviewed_by=?3
      WHERE id=?4 AND status='open'`,
      )
      .bind(status, this.now().toISOString(), actor, id)
      .run();
    if (result.meta?.changes !== 1) throw new CommentTransitionError();
  }

  async createPendingComment(input: CreatePendingCommentInput): Promise<PersistedComment> {
    const id = this.createId();
    const timestamp = this.now().toISOString();
    const comment = persistedCommentSchema.parse({
      ...input,
      id,
      status: "pending",
      consentVersion: COMMENTS_CONSENT_VERSION,
      consentedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      approvedAt: null,
      rejectedAt: null,
      deletedAt: null,
      anonymizedAt: null,
    });
    await this.database
      .prepare(
        `INSERT INTO public_comments (
          id,article_slug,status,public_name,email_normalized,email_hash,body_text,
          consent_version,consented_at,created_at,updated_at,approved_at,rejected_at,
          deleted_at,anonymized_at
        ) VALUES (?1,?2,'pending',?3,?4,?5,?6,?7,?8,?8,?8,NULL,NULL,NULL,NULL)`,
      )
      .bind(
        comment.id,
        comment.articleSlug,
        comment.publicName,
        comment.emailNormalized,
        comment.emailHash,
        comment.bodyText,
        comment.consentVersion,
        timestamp,
      )
      .run();
    return comment;
  }

  async listApprovedComments(
    articleSlug: string,
    options: { cursor?: string; limit?: number; visitorHash?: string } = {},
  ): Promise<CommentPage<PublicComment>> {
    return this.publicPage(articleSlug, options);
  }

  async listCommentsForModeration(
    status: CommentStatus,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<CommentPage<PersistedComment>> {
    const parsedStatus = commentStatusSchema.parse(status);
    const pageLimit = limit(options.limit, MODERATION_LIMIT_MAX);
    const cursor = decodeCursor(options.cursor);
    const result = await this.database
      .prepare(
        `SELECT * FROM public_comments WHERE status=?1
         AND (?2 IS NULL OR created_at > ?2 OR (created_at = ?2 AND id > ?3))
         ORDER BY created_at ASC,id ASC LIMIT ?4`,
      )
      .bind(parsedStatus, cursor?.[0] ?? null, cursor?.[1] ?? null, pageLimit + 1)
      .all<CommentRow>();
    const rows = result.results ?? [];
    const visible = rows.slice(0, pageLimit);
    return {
      items: visible.map(fromRow),
      cursor:
        rows.length > pageLimit && visible.length
          ? encodeCursor(visible.at(-1)!.created_at, visible.at(-1)!.id)
          : undefined,
    };
  }

  async getCommentById(id: string): Promise<PersistedComment | undefined> {
    const row = await this.database
      .prepare("SELECT * FROM public_comments WHERE id=?1")
      .bind(id)
      .first<CommentRow>();
    return row ? fromRow(row) : undefined;
  }

  async approveComment(input: ModerationInput): Promise<void> {
    await this.moderate("approve", input, ["pending"]);
  }

  async rejectComment(input: ModerationInput): Promise<void> {
    await this.moderate("reject", input, ["pending", "approved"]);
  }

  async restoreComment(input: ModerationInput): Promise<void> {
    await this.moderate("approve", input, ["rejected", "spam"]);
  }

  async markCommentAsSpam(input: ModerationInput): Promise<void> {
    await this.moderate("spam", input, ["pending", "approved", "rejected"]);
  }

  async softDeleteAndAnonymize(input: ModerationInput): Promise<void> {
    await this.moderate("delete", input, ["pending", "approved", "rejected", "spam"]);
  }

  async anonymizeExpiredRejectedOrSpam(actor = "comment-retention"): Promise<number> {
    if (!actor.trim() || actor.length > 128) throw new CommentTransitionError();
    const now = this.now();
    const timestamp = now.toISOString();
    const cutoff = new Date(now.valueOf() - RETENTION_MS).toISOString();
    const eligible = "status IN ('rejected','spam') AND anonymized_at IS NULL AND rejected_at<=?2";
    const audit = this.database
      .prepare(
        `INSERT INTO newsroom_audit (id,timestamp,event_json)
      SELECT ?3 || ':' || id,?1,json_object('id',?3 || ':' || id,'timestamp',?1,'actor',?4,
        'action','comment.retention.anonymize','entity','comment','entityId',id,
        'origin','editorial-console','success',json('true'),'version',1)
      FROM public_comments WHERE ${eligible}`,
      )
      .bind(timestamp, cutoff, this.createId(), actor);
    const update = this.database
      .prepare(
        `UPDATE public_comments SET public_name=NULL,email_normalized=NULL,body_text=NULL,
         anonymized_at=?1,updated_at=?1
         WHERE ${eligible}`,
      )
      .bind(timestamp, cutoff);
    const details = this.database.prepare(`UPDATE comment_reports SET detail=NULL
      WHERE detail IS NOT NULL AND comment_id IN (SELECT id FROM public_comments WHERE anonymized_at IS NOT NULL)`);
    const results = await this.database.batch([audit, update, details]);
    if (results.some((result) => !result.success)) throw new Error("Falha de retenção.");
    return results[1].meta?.changes ?? 0;
  }

  private async moderate(
    action: CommentModerationAction,
    input: ModerationInput,
    allowedStatuses: CommentStatus[],
  ): Promise<void> {
    commentModerationActionSchema.parse(action);
    const actor = input.actor.trim();
    const reason = input.reason?.trim() || null;
    if (!actor || actor.length > 128 || (reason?.length ?? 0) > 500)
      throw new Error("Dados de moderação inválidos.");

    const timestamp = this.now().toISOString();
    const eventId = this.createId();
    const placeholders = allowedStatuses.map((_, index) => `?${index + 4}`).join(",");
    const targetStatus =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : action === "delete"
            ? "deleted"
            : action;
    const update = this.moderationUpdate(action, placeholders).bind(
      input.commentId,
      timestamp,
      targetStatus,
      ...allowedStatuses,
    );
    const event = this.database
      .prepare(
        `INSERT INTO comment_moderation_events (id,comment_id,action,actor,reason,created_at)
         SELECT ?1,?2,?3,?4,?5,?6 FROM public_comments
         WHERE id=?2 AND status=?7 AND updated_at=?6 AND changes()=1`,
      )
      .bind(eventId, input.commentId, action, actor, reason, timestamp, targetStatus);
    const statements = [update, event];
    if (action === "delete")
      statements.push(
        this.database
          .prepare(
            "UPDATE comment_reports SET detail=NULL WHERE comment_id=?1 AND EXISTS (SELECT 1 FROM public_comments WHERE id=?1 AND anonymized_at IS NOT NULL)",
          )
          .bind(input.commentId),
      );
    const results = await this.database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success) ||
      results.slice(0, 2).some((result) => (result.meta?.changes ?? 0) !== 1)
    ) {
      throw new CommentTransitionError();
    }
  }

  private moderationUpdate(
    action: CommentModerationAction,
    placeholders: string,
  ): D1PreparedStatement {
    const stateUpdate =
      action === "approve"
        ? "status=?3,approved_at=COALESCE(published_at,?2),published_at=COALESCE(published_at,?2),rejected_at=NULL,updated_at=?2"
        : action === "reject" || action === "spam"
          ? "status=?3,approved_at=NULL,rejected_at=?2,updated_at=?2"
          : "status='deleted',public_name=NULL,email_normalized=NULL,body_text=NULL,approved_at=NULL,rejected_at=NULL,deleted_at=?2,anonymized_at=?2,updated_at=?2";
    return this.database.prepare(
      `UPDATE public_comments SET ${stateUpdate} WHERE id=?1 AND status IN (${placeholders})
        ${action === "approve" || action === "spam" ? "AND anonymized_at IS NULL AND body_text IS NOT NULL" : ""}`,
    );
  }
}
