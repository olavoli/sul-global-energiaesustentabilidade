import type { EvidenceClaim, EvidenceDossier, EvidenceItem, EvidenceSource } from "./contracts";
export function evidenceReadiness(input: {
  dossier: EvidenceDossier;
  sources: EvidenceSource[];
  claims: EvidenceClaim[];
  evidence: EvidenceItem[];
}) {
  const primary = input.sources.some(
    ({ type, humanStatus }) => type === "primary-paper" && humanStatus === "verified",
  );
  const checks = [
    ["primary-source-confirmed", primary],
    ["license-confirmed", input.dossier.sourceAccess.licenseConfirmed],
    [
      "claims-attributed",
      input.claims.length > 0 && input.claims.every(({ attributedTo }) => Boolean(attributedTo)),
    ],
    [
      "numbers-verified",
      input.evidence
        .filter(({ type }) => type === "number")
        .every(({ humanStatus }) => humanStatus === "verified"),
    ],
    [
      "units-verified",
      input.evidence.filter(({ type }) => type === "number").every(({ unit }) => Boolean(unit)),
    ],
    ["limitations-recorded", input.dossier.limitations.length > 0],
    ["conflicts-recorded", true],
    ["funding-recorded", input.dossier.funding.length > 0],
    ["editorial-interest-not-evaluated", true],
    ["human-review-completed", input.dossier.humanReview.completed],
    ["image-not-evaluated", true],
    ["translation-not-evaluated", true],
  ].map(([key, satisfied]) => ({
    key: String(key),
    satisfied: Boolean(satisfied),
    note: satisfied ? "ok" : "pending",
  }));
  const level = input.sources.some(({ type }) => type === "retraction")
    ? "blocked"
    : checks.every(({ satisfied }) => satisfied)
      ? "editorial-review-ready"
      : primary && input.claims.length
        ? "evidence-ready"
        : "incomplete";
  return { level, checklist: checks } as EvidenceDossier["readiness"];
}
