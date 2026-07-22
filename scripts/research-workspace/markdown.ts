export function sanitizeResearchMarkdown(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*(?:import|export)\s.+$/gim, "")
    .replace(/\]\(\s*(?:javascript|data|vbscript):[^)]*\)/gi, "](#)")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .join("")
    .trim()
    .slice(0, 10_000);
}
