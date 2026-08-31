const editorialBlockSelector = "h2, h3, h4, p, li, blockquote";

export interface EditorialSpeechBlock {
  element: HTMLElement;
  text: string;
}

export type TtsPlaybackStatus = "checking" | "idle" | "playing" | "paused" | "unsupported";

export interface TtsPlaybackState {
  status: TtsPlaybackStatus;
  index: number;
  total: number;
}

export type TtsPlaybackAction =
  | {
      type:
        | "SUPPORTED"
        | "UNSUPPORTED"
        | "PAUSE"
        | "RESUME"
        | "STOP"
        | "AUTO_NEXT"
        | "RESTART_CURRENT";
    }
  | { type: "START_AT"; index: number; total: number };

export const initialTtsPlayback: TtsPlaybackState = { status: "checking", index: 0, total: 0 };

export function ttsPlaybackReducer(
  state: TtsPlaybackState,
  action: TtsPlaybackAction,
): TtsPlaybackState {
  switch (action.type) {
    case "SUPPORTED":
      return { ...state, status: "idle" };
    case "UNSUPPORTED":
      return { ...state, status: "unsupported" };
    case "START_AT":
      return {
        status: "playing",
        index: Math.max(0, Math.min(action.index, Math.max(0, action.total - 1))),
        total: action.total,
      };
    case "AUTO_NEXT":
      return state.index + 1 < state.total
        ? { ...state, status: "playing", index: state.index + 1 }
        : { status: "idle", index: 0, total: state.total };
    case "PAUSE":
      return state.status === "playing" ? { ...state, status: "paused" } : state;
    case "RESUME":
      return state.status === "paused" ? { ...state, status: "playing" } : state;
    case "RESTART_CURRENT":
      return { ...state, status: "playing" };
    case "STOP":
      return { ...state, status: "idle", index: 0 };
  }
}

export function selectBrazilianPortugueseVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  const language = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replace("_", "-");
  return (
    voices.find((voice) => language(voice) === "pt-br") ??
    voices.find(
      (voice) => language(voice).startsWith("pt") && /brasil|brazil|brasileir/i.test(voice.name),
    ) ??
    voices.find((voice) => language(voice).startsWith("pt"))
  );
}

export function getPortugueseVoices(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return voices
    .filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith("pt"))
    .sort((left, right) => {
      const leftBrazilian = left.lang.toLowerCase().replace("_", "-") === "pt-br";
      const rightBrazilian = right.lang.toLowerCase().replace("_", "-") === "pt-br";
      if (leftBrazilian !== rightBrazilian) return leftBrazilian ? -1 : 1;
      return left.name.localeCompare(right.name, "pt-BR");
    });
}

export function chunkSpeechText(text: string, maxLength = 220): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?…])\s+/u);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      chunks.push(sentence);
      continue;
    }

    const words = sentence.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxLength && current) {
        chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}

export function extractEditorialSpeechChunks(root: HTMLElement): string[] {
  const clone = root.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("figcaption, [data-tts-exclude='true'], nav, button, script, style, noscript")
    .forEach((node) => node.remove());

  return Array.from(clone.querySelectorAll<HTMLElement>(editorialBlockSelector))
    .filter((element) => !element.querySelector(editorialBlockSelector))
    .map((element) => element.textContent ?? "")
    .flatMap((text) => chunkSpeechText(text));
}

export function extractEditorialSpeechBlocks(root: HTMLElement): EditorialSpeechBlock[] {
  return Array.from(root.querySelectorAll<HTMLElement>(editorialBlockSelector))
    .filter((element) => !element.querySelector(editorialBlockSelector))
    .filter(
      (element) =>
        !element.closest(
          "figcaption, [data-tts-exclude='true'], nav, button, script, style, noscript",
        ),
    )
    .map((element) => ({
      element,
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
    }))
    .filter((block) => Boolean(block.text));
}
