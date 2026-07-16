import type { EditorialReadiness, RiskMatrix } from "./orchestrator-schema";
import type { EvidencePackage, StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";

type Dimension = EditorialReadiness["sourceReady"];

function dimension(
  state: Dimension["state"],
  evidence: string[],
  blockers: string[],
  requiredActions: string[],
): Dimension {
  return { state, evidence, blockers, requiredActions };
}

export function evaluateReadiness(
  cluster: StoryCluster,
  evidence: EvidencePackage,
  translations: TranslationEntry[],
  risks: RiskMatrix,
  blockers: string[],
): EditorialReadiness {
  const pendingTranslation = translations.some(
    ({ clusterId, status }) =>
      clusterId === cluster.id && !["approved", "not-required"].includes(status),
  );
  const sourceReady = evidence.sources.length
    ? dimension(
        "ready",
        evidence.sources.map(({ url }) => url),
        [],
        [],
      )
    : dimension("blocked", [], ["missing-source"], ["Adicionar fonte atribuída e URL original."]);
  const evidenceReady =
    cluster.independentSourceCount > 1
      ? dimension("ready", ["Mais de uma instituição presente."], [], [])
      : dimension(
          "partial",
          ["Fonte única explicitamente registrada."],
          [],
          ["Buscar confirmação independente."],
        );
  const translationReady = pendingTranslation
    ? dimension(
        "blocked",
        ["Há tradução ainda não aprovada."],
        ["unreviewed-translation"],
        ["Submeter tradução à revisão humana."],
      )
    : dimension("not-required", ["Nenhuma tradução pendente sustenta a decisão."], [], []);
  const factualReady = evidence.contradictions.length
    ? dimension(
        "blocked",
        evidence.contradictions,
        ["unreviewed-contradiction"],
        ["Revisar contradições nas fontes originais."],
      )
    : dimension(
        "partial",
        ["Claims permanecem atribuídos e não confirmados."],
        [],
        ["Executar fact-check humano."],
      );
  const legalReady = [risks.legal.level, risks.privacy.level].some((level) =>
    ["high", "critical"].includes(level),
  )
    ? dimension(
        "blocked",
        [...risks.legal.reasons, ...risks.privacy.reasons],
        ["legal-review-required"],
        ["Obter revisão jurídica/editorial."],
      )
    : dimension("unknown", [], [], ["Avaliar risco jurídico antes da redação."]);
  const topicReady = cluster.topics.length
    ? dimension("ready", cluster.topics, [], [])
    : dimension(
        "blocked",
        [],
        ["insufficient-topic-evidence"],
        ["Demonstrar relação editorial mínima."],
      );
  const overallBlocked = blockers.length > 0;
  const common = {
    imageReady: dimension(
      "not-required",
      ["Pauta inicial não depende de imagem."],
      [],
      ["Definir mídia licenciada antes de review do artigo."],
    ),
    audienceReady: dimension(
      "partial",
      ["Público técnico geral previsto pela política."],
      [],
      ["Confirmar público na pauta."],
    ),
    timingReady: dimension(
      "partial",
      [cluster.lastUpdatedAt],
      [],
      ["Reavaliar atualidade no momento da pauta."],
    ),
    diversityReady:
      cluster.independentSourceCount > 1
        ? dimension("ready", ["Fontes institucionais independentes."], [], [])
        : dimension(
            "partial",
            ["single-source"],
            [],
            ["Buscar diversidade institucional e geográfica."],
          ),
  };
  return {
    sourceReady,
    evidenceReady,
    translationReady,
    factualReady,
    legalReady,
    ...common,
    topicReady,
    overallReady: overallBlocked
      ? dimension("blocked", [], blockers, ["Resolver todos os bloqueadores antes de pauta."])
      : dimension(
          "partial",
          ["Sem bloqueador técnico obrigatório."],
          [],
          ["Revisão humana continua obrigatória."],
        ),
  };
}
