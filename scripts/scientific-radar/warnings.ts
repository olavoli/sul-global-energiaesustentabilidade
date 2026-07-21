import type { ScientificWarning, ScientificWarningSeverity, ScientificWork } from "./contracts";

export type WarningInput = Pick<
  ScientificWork,
  | "publicationDate"
  | "journal"
  | "publisher"
  | "authors"
  | "institutions"
  | "countries"
  | "license"
  | "openAccess"
  | "openAccessUrl"
  | "type"
  | "peerReviewStatus"
  | "corrected"
  | "retracted"
  | "crossrefValidated"
  | "citedByCount"
> & { crossrefDivergence?: boolean; manualReviewRequired?: boolean };

const tdmPattern = /(?:text-and-data-mining|tdm\/|tdm\.|policy-029)/i;
const openLicensePattern = /(?:cc-by|creativecommons\.org\/licenses\/by\/|cc0)/i;

function warning(
  code: ScientificWarning["code"],
  severity: ScientificWarningSeverity,
  message: string,
  source: string,
  detectedAt: string,
): ScientificWarning {
  return { code, severity, message, source, detectedAt, resolved: false };
}

export function detectScientificWarnings(
  input: WarningInput,
  detectedAt: string,
): ScientificWarning[] {
  const warnings: ScientificWarning[] = [];
  const license = input.license ?? "";
  if (!input.openAccess || (license && !openLicensePattern.test(license))) {
    warnings.push(
      warning(
        "license-not-open",
        "warning",
        "A licença informada não confirma reutilização em acesso aberto.",
        "license-metadata",
        detectedAt,
      ),
    );
  }
  if (tdmPattern.test(license)) {
    warnings.push(
      warning(
        "tdm-only",
        "warning",
        "A licença indicada cobre mineração de texto e dados; ela não equivale a Open Access.",
        "license-metadata",
        detectedAt,
      ),
    );
  }
  if (input.peerReviewStatus !== "confirmed") {
    warnings.push(
      warning(
        "peer-review-unconfirmed",
        "warning",
        input.peerReviewStatus === "probable"
          ? "A revisão por pares é provável pelo tipo e periódico, mas não foi confirmada diretamente."
          : "A revisão por pares não foi confirmada.",
        "metadata-classification",
        detectedAt,
      ),
    );
  }
  if (!input.journal || !input.publisher || input.authors.length === 0) {
    warnings.push(
      warning(
        "metadata-incomplete",
        "warning",
        "Metadados bibliográficos essenciais estão incompletos.",
        "stored-metadata",
        detectedAt,
      ),
    );
  }
  if (Date.parse(input.publicationDate) > Date.parse(detectedAt) + 86_400_000) {
    warnings.push(
      warning(
        "future-date-suspected",
        "warning",
        "A data de publicação está no futuro e requer verificação manual.",
        "publication-date",
        detectedAt,
      ),
    );
  }
  if (!input.crossrefValidated || input.crossrefDivergence) {
    warnings.push(
      warning(
        "crossref-divergence",
        "blocker",
        "Os metadados ou o DOI divergem da confirmação Crossref.",
        "crossref-validation",
        detectedAt,
      ),
    );
  }
  if (/preprint|posted-content/i.test(input.type)) {
    warnings.push(
      warning(
        "preprint",
        "warning",
        "O trabalho foi identificado como preprint.",
        "work-type",
        detectedAt,
      ),
    );
  }
  if (input.corrected) {
    warnings.push(
      warning(
        "corrected",
        "warning",
        "O trabalho possui correção ou atualização registrada.",
        "correction-status",
        detectedAt,
      ),
    );
  }
  if (input.retracted) {
    warnings.push(
      warning(
        "retracted",
        "blocker",
        "O trabalho está marcado como retratado.",
        "retraction-status",
        detectedAt,
      ),
    );
  }
  if (input.openAccess && !input.openAccessUrl) {
    warnings.push(
      warning(
        "open-access-url-missing",
        "info",
        "O trabalho está marcado como Open Access, mas a URL aberta não foi armazenada.",
        "open-access-metadata",
        detectedAt,
      ),
    );
  }
  if (input.institutions.length === 0) {
    warnings.push(
      warning(
        "institution-missing",
        "info",
        "Nenhuma instituição foi informada nos metadados armazenados.",
        "stored-metadata",
        detectedAt,
      ),
    );
  }
  if (input.countries.length === 0) {
    warnings.push(
      warning(
        "country-missing",
        "info",
        "O país das instituições não foi armazenado e requer verificação futura.",
        "stored-metadata",
        detectedAt,
      ),
    );
  }
  warnings.push(
    warning(
      "citation-count-volatile",
      "info",
      `A contagem de ${input.citedByCount} citações é temporal e pode mudar.`,
      "citation-metadata",
      detectedAt,
    ),
  );
  if (input.manualReviewRequired) {
    warnings.push(
      warning(
        "manual-review-required",
        "warning",
        "O registro requer revisão humana antes de qualquer uso editorial.",
        "human-review",
        detectedAt,
      ),
    );
  }
  return warnings;
}

const severityRank: Record<ScientificWarningSeverity, number> = {
  info: 1,
  warning: 2,
  blocker: 3,
};

export function highestWarningSeverity(
  warnings: ScientificWarning[],
): ScientificWarningSeverity | "none" {
  return warnings
    .filter(({ resolved }) => !resolved)
    .reduce<
      ScientificWarningSeverity | "none"
    >((highest, current) => (highest === "none" || severityRank[current.severity] > severityRank[highest] ? current.severity : highest), "none");
}

export function hasUnresolvedBlocker(warnings: ScientificWarning[]): boolean {
  return warnings.some(({ severity, resolved }) => severity === "blocker" && !resolved);
}
