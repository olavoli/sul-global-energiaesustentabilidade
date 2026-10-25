/** Format helpers for editorial UI (dates, reading time). */

export function formatDate(iso: string, locale = "pt-BR"): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min de leitura`;
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
