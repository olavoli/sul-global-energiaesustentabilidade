import {
  COMMENTS_CONSENT_VERSION,
  commentModerationActionSchema,
  commentStatusSchema,
  persistedCommentSchema,
  type CommentModerationAction,
  type CommentStatus,
  type PersistedComment,
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
}

export interface PublicComment {
  id: string;
  publicName: string;
  bodyText: string;
  approvedAt: string;
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
  createPendingComment(input: CreatePendingCommentInput): Promise<PersistedComment>;
  listApprovedComments(
    articleSlug: string,
    options?: { cursor?: string; limit?: number },
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
  anonymizeExpiredRejectedOrSpam(): Promise<number>;
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
  });
}

export class D1PublicCommentRepository implements PublicCommentRepository {
  constructor(
    private readonly database: D1Database,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

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
    options: { cursor?: string; limit?: number } = {},
  ): Promise<CommentPage<PublicComment>> {
    const pageLimit = limit(options.limit, PUBLIC_LIMIT_MAX);
    const cursor = decodeCursor(options.cursor);
    const result = await this.database
      .prepare(
        `SELECT id,public_name,body_text,approved_at FROM public_comments
         WHERE article_slug=?1 AND status='approved'
           AND (?2 IS NULL OR approved_at < ?2 OR (approved_at = ?2 AND id < ?3))
         ORDER BY approved_at DESC,id DESC LIMIT ?4`,
      )
      .bind(articleSlug, cursor?.[0] ?? null, cursor?.[1] ?? null, pageLimit + 1)
      .all<{ id: string; public_name: string; body_text: string; approved_at: string }>();
    const rows = result.results ?? [];
    const visible = rows.slice(0, pageLimit);
    return {
      items: visible.map((row) => ({
        id: row.id,
        publicName: row.public_name,
        bodyText: row.body_text,
        approvedAt: row.approved_at,
      })),
      cursor:
        rows.length > pageLimit && visible.length
          ? encodeCursor(visible.at(-1)!.approved_at, visible.at(-1)!.id)
          : undefined,
    };
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
    await this.moderate("reject", input, ["pending"]);
  }

  async markCommentAsSpam(input: ModerationInput): Promise<void> {
    await this.moderate("spam", input, ["pending", "rejected"]);
  }

  async softDeleteAndAnonymize(input: ModerationInput): Promise<void> {
    await this.moderate("delete", input, ["pending", "approved", "rejected", "spam"]);
  }

  async anonymizeExpiredRejectedOrSpam(): Promise<number> {
    const now = this.now();
    const timestamp = now.toISOString();
    const cutoff = new Date(now.valueOf() - RETENTION_MS).toISOString();
    const result = await this.database
      .prepare(
        `UPDATE public_comments SET public_name=NULL,email_normalized=NULL,body_text=NULL,
         anonymized_at=?1,updated_at=?1
         WHERE status IN ('rejected','spam') AND anonymized_at IS NULL
         AND rejected_at<=?2`,
      )
      .bind(timestamp, cutoff)
      .run();
    return result.meta?.changes ?? 0;
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
      action === "approve" ? "approved" : action === "reject" ? "rejected" : action;
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
         WHERE id=?2 AND status=?7 AND updated_at=?6`,
      )
      .bind(eventId, input.commentId, action, actor, reason, timestamp, targetStatus);
    const results = await this.database.batch([update, event]);
    if (
      results.length !== 2 ||
      results.some((result) => !result.success || (result.meta?.changes ?? 0) !== 1)
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
        ? "status=?3,approved_at=?2,updated_at=?2"
        : action === "reject" || action === "spam"
          ? "status=?3,approved_at=NULL,rejected_at=?2,updated_at=?2"
          : "status='deleted',public_name=NULL,email_normalized=NULL,body_text=NULL,approved_at=NULL,rejected_at=NULL,deleted_at=?2,anonymized_at=?2,updated_at=?2";
    return this.database.prepare(
      `UPDATE public_comments SET ${stateUpdate} WHERE id=?1 AND status IN (${placeholders})`,
    );
  }
}
