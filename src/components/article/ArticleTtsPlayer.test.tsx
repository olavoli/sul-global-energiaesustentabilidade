import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ArticleTtsPlayer } from "./ArticleTtsPlayer";
import {
  chunkSpeechText,
  getPortugueseVoices,
  initialTtsPlayback,
  selectBrazilianPortugueseVoice,
  ttsPlaybackReducer,
  type TtsPlaybackState,
} from "./article-tts";

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { default: false, lang, localService: true, name, voiceURI: name };
}

describe("ArticleTtsPlayer", () => {
  const playing: TtsPlaybackState = { status: "playing", index: 2, total: 5 };

  test("prioriza uma voz pt-BR", () => {
    const voices = [voice("Português", "pt-PT"), voice("Maria Brasil", "pt-BR")];
    expect(selectBrazilianPortugueseVoice(voices)?.name).toBe("Maria Brasil");
  });

  test("usa outra voz portuguesa quando pt-BR não está disponível", () => {
    const voices = [voice("English", "en-US"), voice("Português", "pt-PT")];
    expect(selectBrazilianPortugueseVoice(voices)?.lang).toBe("pt-PT");
  });

  test("filtra idiomas irrelevantes e ordena pt-BR antes de pt-PT", () => {
    const voices = [
      voice("English", "en-US"),
      voice("Português europeu", "pt-PT"),
      voice("Maria", "pt-BR"),
    ];
    expect(getPortugueseVoices(voices).map(({ name }) => name)).toEqual([
      "Maria",
      "Português europeu",
    ]);
  });

  test("divide texto longo sem perder palavras", () => {
    const text = "Uma frase curta. " + "palavra ".repeat(80).trim() + ".";
    const chunks = chunkSpeechText(text, 80);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
  });

  test("avanço inicia o bloco seguinte", () => {
    expect(ttsPlaybackReducer(playing, { type: "START_AT", index: 3, total: 5 }).index).toBe(3);
  });

  test("retrocesso inicia o bloco anterior", () => {
    expect(ttsPlaybackReducer(playing, { type: "START_AT", index: 1, total: 5 }).index).toBe(1);
  });

  test("troca de velocidade reinicia sem perder o bloco atual", () => {
    expect(ttsPlaybackReducer(playing, { type: "RESTART_CURRENT" })).toEqual(playing);
  });

  test("troca de voz reinicia sem perder o bloco atual", () => {
    expect(ttsPlaybackReducer(playing, { type: "RESTART_CURRENT" }).index).toBe(2);
  });

  test("transição automática avança um bloco", () => {
    expect(ttsPlaybackReducer(playing, { type: "AUTO_NEXT" }).index).toBe(3);
  });

  test("pause e continue preservam o índice", () => {
    const paused = ttsPlaybackReducer(playing, { type: "PAUSE" });
    expect(paused).toEqual({ ...playing, status: "paused" });
    expect(ttsPlaybackReducer(paused, { type: "RESUME" })).toEqual(playing);
  });

  test("stop cancela e retorna ao primeiro bloco", () => {
    expect(ttsPlaybackReducer(playing, { type: "STOP" })).toEqual({
      status: "idle",
      index: 0,
      total: 5,
    });
    expect(initialTtsPlayback.index).toBe(0);
  });

  test("renderiza controles acessíveis sem depender da API durante SSR", () => {
    const html = renderToStaticMarkup(
      <ArticleTtsPlayer contentRef={{ current: null }} articleKey="artigo-teste" />,
    );
    expect(html).toContain('aria-label="Leitor de texto do artigo"');
    expect(html).toContain('aria-label="Ouvir artigo"');
    expect(html).toContain('aria-label="Voltar ao bloco anterior"');
    expect(html).toContain('aria-label="Avançar ao próximo bloco"');
    expect(html).toContain('aria-label="Pausar leitura"');
    expect(html).toContain('aria-label="Parar leitura e voltar ao primeiro bloco"');
    expect(html).toContain('aria-label="Velocidade de leitura"');
    expect(html).toContain('aria-label="Voz da leitura"');
  });
});
