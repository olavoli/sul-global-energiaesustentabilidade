import { describe, expect, test } from "bun:test";

import { mergeClusters, splitCluster } from "./cluster-mutations";
import { classifyRelation, clusterQueue, titleSimilarity } from "./clustering";
import { buildEvidencePackage, extractClaims } from "./evidence-packages";
import { NOW, item, source } from "./story-test-fixtures";

const sources = [
  source("source-a", "https://source-a.example.test/"),
  source("source-b", "https://source-b.example.org/"),
];

describe("Sprint 14 — clustering e evidência", () => {
  test("1. agrupa GUID idêntico", () => {
    const queue = [
      item("a", "NASA battery update"),
      item("b", "NASA battery update", "source-b", { guid: "guid-a" }),
    ];
    expect(clusterQueue(queue, sources, NOW)).toHaveLength(1);
  });

  test("2. agrupa URL canônica idêntica", () => {
    const left = item("a", "NASA storage report");
    const right = item("b", "NASA storage report", "source-b", {
      canonicalUrl: left.item.canonicalUrl,
    });
    expect(clusterQueue([left, right], sources, NOW)).toHaveLength(1);
  });

  test("3. agrupa hash idêntico", () => {
    const left = item("a", "MIT storage study");
    const right = item("b", "MIT storage study", "source-b", { hash: left.item.hash });
    expect(clusterQueue([left, right], sources, NOW)).toHaveLength(1);
  });

  test("4. agrupa título forte com entidade, tema e proximidade temporal", () => {
    const queue = [
      item("a", "NASA launches solar storage mission"),
      item("b", "NASA launches new solar storage mission", "source-b"),
    ];
    expect(titleSimilarity(queue[0].item.title, queue[1].item.title)).toBeGreaterThanOrEqual(0.72);
    expect(clusterQueue(queue, sources, NOW)).toHaveLength(1);
  });

  test("5. tema genérico energia não agrupa eventos distintos", () => {
    expect(
      clusterQueue(
        [item("a", "Brazil energy auction"), item("b", "NASA energy mission", "source-b")],
        sources,
        NOW,
      ),
    ).toHaveLength(2);
  });

  test("6. related-distinct é detectado sem merge", () => {
    const left = item("a", "NASA solar storage policy report");
    const right = item("b", "NASA solar storage market analysis", "source-b");
    expect(classifyRelation(left, right, sources)?.type).toBe("commentary-analysis");
    expect(clusterQueue([left, right], sources, NOW)).toHaveLength(2);
  });

  test("7. fontes institucionais independentes são preservadas", () => {
    const left = item("a", "NASA battery update");
    const right = item("b", "NASA battery update", "source-b", { guid: "guid-a" });
    expect(clusterQueue([left, right], sources, NOW)[0].independentSourceCount).toBe(2);
  });

  test("8. dois feeds da mesma instituição não contam como independentes", () => {
    const same = [
      source("source-a", "https://news.example.org/a"),
      source("source-b", "https://research.example.org/b"),
    ];
    const left = item("a", "NASA battery update");
    const right = item("b", "NASA battery update", "source-b", { guid: "guid-a" });
    expect(clusterQueue([left, right], same, NOW)[0].independentSourceCount).toBe(1);
  });

  test("9. atualizações preservam todos os itens", () => {
    const left = item("a", "MIT solar storage update");
    const right = item("b", "MIT solar storage update", "source-a", { guid: left.item.guid });
    expect(clusterQueue([left, right], sources, NOW)[0].itemIds.sort()).toEqual(["a", "b"]);
  });

  test("10. fonte primária é candidata, nunca certeza automática", () => {
    const cluster = clusterQueue([item("a", "NASA storage notice")], sources, NOW)[0];
    expect(cluster.primarySourceCandidate?.confidence).toBe("medium");
    expect(cluster.primarySourceCandidate?.limitations.length).toBeGreaterThan(0);
  });

  test("11. claim de fonte única permanece não confirmado", () => {
    const queue = [item("a", "NASA may launch battery mission")];
    const claim = extractClaims(clusterQueue(queue, sources, NOW)[0], queue)[0];
    expect(claim.status).toBe("needs-review");
    expect(claim.type).toBe("projection");
  });

  test("12. claims equivalentes preservam múltiplas fontes", () => {
    const left = item("a", "NASA launches battery mission");
    const right = item("b", left.item.title, "source-b", { guid: left.item.guid });
    const cluster = clusterQueue([left, right], sources, NOW)[0];
    expect(extractClaims(cluster, [left, right])[0].sourceIds).toHaveLength(2);
  });

  test("13. possível conflito é sinalizado sem resolver automaticamente", () => {
    const left = item("a", "NASA battery output increase");
    const right = item("b", "NASA battery output decrease", "source-b", { guid: left.item.guid });
    const cluster = clusterQueue([left, right], sources, NOW)[0];
    expect(buildEvidencePackage(cluster, [left, right], sources, NOW).contradictions).toHaveLength(
      1,
    );
  });

  test("14. anúncio e alegação recebem tipagem conservadora", () => {
    const queue = [
      item("a", "NASA announces battery mission"),
      item("b", "Company alleges battery failure"),
    ];
    const types = clusterQueue(queue, sources, NOW).flatMap((cluster) =>
      extractClaims(cluster, queue).map(({ type }) => type),
    );
    expect(types).toContain("announcement");
    expect(types).toContain("allegation");
  });

  test("15. pacote preserva URLs e não inclui matéria integral", () => {
    const queue = [item("a", "NASA battery mission")];
    const pack = buildEvidencePackage(clusterQueue(queue, sources, NOW)[0], queue, sources, NOW);
    expect(pack.originalUrls).toEqual([queue[0].item.originalUrl]);
    expect(JSON.stringify(pack)).not.toContain("fullText");
  });

  test("16. pacote não inventa confirmação independente", () => {
    const queue = [item("a", "NASA battery mission")];
    expect(
      buildEvidencePackage(clusterQueue(queue, sources, NOW)[0], queue, sources, NOW).confirmations,
    ).toEqual([]);
  });

  test("17. merge manual registra ator e motivo", () => {
    const queue = [item("a", "NASA solar"), item("b", "MIT wind", "source-b")];
    const clusters = clusterQueue(queue, sources, NOW);
    const merged = mergeClusters(
      clusters,
      clusters.map(({ id }) => id),
      queue,
      sources,
      "editor",
      "mesmo evento confirmado manualmente",
      NOW,
    )[0];
    expect(merged.history.at(-1)).toMatchObject({ actor: "editor", action: "manual-merge" });
  });

  test("18. split manual preserva histórico", () => {
    const left = item("a", "NASA storage");
    const right = item("b", "NASA storage", "source-b", { guid: left.item.guid });
    const clusters = clusterQueue([left, right], sources, NOW);
    expect(
      splitCluster(
        clusters,
        clusters[0].id,
        ["b"],
        [left, right],
        sources,
        "editor",
        "eventos distintos",
        NOW,
      ).every(({ history }) => history.at(-1)?.action === "manual-split"),
    ).toBeTrue();
  });

  test("19. IDs e resultado do clustering são determinísticos", () => {
    const queue = [item("a", "NASA storage"), item("b", "MIT wind", "source-b")];
    expect(clusterQueue(queue, sources, NOW)).toEqual(clusterQueue(queue, sources, NOW));
  });

  test("20. cluster não altera estado da fila nem publica", () => {
    const queue = [item("a", "NASA storage")];
    clusterQueue(queue, sources, NOW);
    expect(queue[0].state).toBe("scored");
    expect(queue[0].state).not.toBe("approved-for-draft");
  });
});
