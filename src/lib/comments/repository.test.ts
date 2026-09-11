import { describe, expect, test } from "bun:test";

import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
} from "../../../scripts/newsroom/storage/d1-types";
import { CommentTransitionError, D1PublicCommentRepository } from "./repository";

const now = new Date("2026-12-10T12:00:00.000Z");
const hash = "a".repeat(64);

interface ScriptedResult {
  first?: unknown;
  all?: unknown[];
  changes?: number;
}

class FakeStatement implements D1PreparedStatement {
  values: unknown[] = [];
  constructor(
    readonly query: string,
    private readonly result: ScriptedResult = {},
  ) {}
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  async first<T>() {
    return (this.result.first ?? null) as T | null;
  }
  async all<T>(): Promise<D1Result<T>> {
    return { success: true, results: (this.result.all ?? []) as T[] };
  }
  async run<T>(): Promise<D1Result<T>> {
    return { success: true, meta: { changes: this.result.changes ?? 1 } };
  }
}

class FakeD1 implements D1Database {
  readonly statements: FakeStatement[] = [];
  readonly scripted: ScriptedResult[] = [];
  batchChanges: number[] = [1, 1];
  prepare(query: string) {
    const statement = new FakeStatement(query, this.scripted.shift());
    this.statements.push(statement);
    return statement;
  }
  async batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return statements.map((_, index) => ({
      success: true,
      meta: { changes: this.batchChanges[index] ?? 0 },
    }));
  }
  async exec() {
    return { success: true };
  }
}

function pendingRow(id = "comment-1") {
  return {
    id,
    article_slug: "artigo-publicado",
    status: "pending",
    public_name: "Leitora",
    email_normalized: "leitora@example.com",
    email_hash: hash,
    body_text: "Comentário público.",
    consent_version: "comments-v1",
    consented_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    approved_at: null,
    rejected_at: null,
    deleted_at: null,
    anonymized_at: null,
  };
}

function repository(database = new FakeD1()) {
  return {
    database,
    repository: new D1PublicCommentRepository(
      database,
      () => now,
      () => "generated-id",
    ),
  };
}

describe("repositório D1 de comentários", () => {
  test("cria sempre pending com versão e timestamps do servidor", async () => {
    const { database, repository: comments } = repository();
    const created = await comments.createPendingComment({
      articleSlug: "artigo-publicado",
      publicName: "Leitora",
      emailNormalized: "leitora@example.com",
      emailHash: hash,
      bodyText: "Comentário público.",
    });
    expect(created).toMatchObject({
      id: "generated-id",
      status: "pending",
      consentVersion: "comments-v1",
      createdAt: now.toISOString(),
    });
    expect(database.statements[0].query).toContain("INSERT INTO public_comments");
  });

  test("lista publicamente somente campos aprovados, sem PII privada", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({
      all: [
        {
          id: "approved-1",
          public_name: "Pessoa",
          body_text: "Texto aprovado.",
          approved_at: now.toISOString(),
        },
      ],
    });
    const page = await comments.listApprovedComments("artigo-publicado");
    expect(page.items[0]).toEqual({
      id: "approved-1",
      publicName: "Pessoa",
      bodyText: "Texto aprovado.",
      approvedAt: now.toISOString(),
    });
    expect(JSON.stringify(page)).not.toMatch(/email|hash|consent|actor|reason/i);
    expect(database.statements[0].query).toContain("status='approved'");
  });

  test("aplica teto e cursor determinístico na listagem pública", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({
      all: Array.from({ length: 51 }, (_, index) => ({
        id: `id-${String(99 - index).padStart(2, "0")}`,
        public_name: "Pessoa",
        body_text: "Texto aprovado.",
        approved_at: now.toISOString(),
      })),
    });
    const first = await comments.listApprovedComments("artigo-publicado", { limit: 500 });
    expect(first.items).toHaveLength(50);
    expect(first.cursor).toBeDefined();
    expect(database.statements[0].values.at(-1)).toBe(51);

    database.scripted.push({ all: [] });
    await comments.listApprovedComments("artigo-publicado", { cursor: first.cursor, limit: 1 });
    expect(database.statements[1].values.slice(1, 3)).toEqual([
      now.toISOString(),
      first.items.at(-1)?.id,
    ]);
  });

  test("pagina deterministicamente a fila de moderação com teto próprio", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({
      all: Array.from({ length: 101 }, (_, index) => pendingRow(`id-${index}`)),
    });
    const page = await comments.listCommentsForModeration("pending", { limit: 500 });
    expect(page.items).toHaveLength(100);
    expect(page.cursor).toBeDefined();
    expect(database.statements[0].query).toContain("ORDER BY created_at ASC,id ASC");
    expect(database.statements[0].values.at(-1)).toBe(101);
  });

  test("permite transições válidas e grava evento sem PII", async () => {
    for (const [method, action] of [
      ["approveComment", "approve"],
      ["rejectComment", "reject"],
      ["markCommentAsSpam", "spam"],
      ["softDeleteAndAnonymize", "delete"],
    ] as const) {
      const { database, repository: comments } = repository();
      await comments[method]({ commentId: "comment-1", actor: "editor", reason: "regra" });
      expect(database.statements).toHaveLength(2);
      const event = database.statements[1];
      expect(event.query).toContain("INSERT INTO comment_moderation_events");
      expect(event.values).toContain(action);
      expect(event.values).not.toContain("Leitora");
      expect(event.values).not.toContain("leitora@example.com");
      expect(event.values).not.toContain("Comentário público.");
    }
  });

  test("rejeita transição inválida sem registrar evento efetivo", async () => {
    const { database, repository: comments } = repository();
    database.batchChanges = [0, 0];
    await expect(
      comments.approveComment({ commentId: "comment-1", actor: "editor" }),
    ).rejects.toBeInstanceOf(CommentTransitionError);
  });

  test("delete limpa toda PII e preserva o hash", async () => {
    const { database, repository: comments } = repository();
    await comments.softDeleteAndAnonymize({ commentId: "comment-1", actor: "editor" });
    expect(database.statements[0].query).toContain(
      "public_name=NULL,email_normalized=NULL,body_text=NULL",
    );
    expect(database.statements[0].query).not.toContain("email_hash=NULL");
  });

  test("não anonimiza rejected/spam antes do corte de 90 dias", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({ changes: 0 });
    expect(await comments.anonymizeExpiredRejectedOrSpam()).toBe(0);
    expect(database.statements[0].values[1]).toBe("2026-09-11T12:00:00.000Z");
  });

  test("anonimiza rejected/spam após o corte de 90 dias", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({ changes: 2 });
    expect(await comments.anonymizeExpiredRejectedOrSpam()).toBe(2);
    const statement = database.statements[0];
    expect(statement.query).toContain("status IN ('rejected','spam')");
    expect(statement.query).toContain("rejected_at<=?2");
    expect(statement.values[1]).toBe("2026-09-11T12:00:00.000Z");
  });

  test("não consulta nem escreve newsroom_documents", async () => {
    const { database, repository: comments } = repository();
    database.scripted.push({ first: pendingRow() });
    await comments.getCommentById("comment-1");
    expect(database.statements.map(({ query }) => query).join(" ")).not.toContain(
      "newsroom_documents",
    );
  });
});
