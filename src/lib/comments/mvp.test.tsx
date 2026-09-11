import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { handleCommentsRequest, hmacCommentEmail } from "./handler";

describe("MVP de comentários", () => {
  test("permanece fail-closed quando a flag está desligada", async () => {
    const response = await handleCommentsRequest(
      new Request("http://localhost/api/articles/artigo-publicado/comments"),
      { COMMENTS_ENABLED: "false" },
    );
    expect(response?.status).toBe(404);
  });

  test("usa HMAC-SHA-256 determinístico e não devolve o e-mail", async () => {
    const digest = await hmacCommentEmail("pessoa@example.com", "segredo-de-teste");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("pessoa@example.com");
  });

  test("componente contém consentimento, acessibilidade e exclusão do TTS", () => {
    return readFile("src/components/comments/CommentsSection.tsx", "utf8").then((source) => {
      expect(source).toContain('data-tts-exclude="true"');
      expect(source).toContain('aria-live="polite"');
      expect(source).toContain("O e-mail não será exibido publicamente");
      expect(source).toContain("Regras de Participação");
    });
  });
});
