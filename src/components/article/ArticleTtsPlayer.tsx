import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  extractEditorialSpeechBlocks,
  getPortugueseVoices,
  initialTtsPlayback,
  selectBrazilianPortugueseVoice,
  ttsPlaybackReducer,
  type EditorialSpeechBlock,
} from "./article-tts";

const readingRates = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const rateStorageKey = "sges:tts:rate";
const voiceStorageKey = "sges:tts:voice";

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage can be unavailable. */
  }
}

export function ArticleTtsPlayer({
  contentRef,
  articleKey,
}: {
  contentRef: RefObject<HTMLElement | null>;
  articleKey: string;
}) {
  const [playback, dispatch] = useReducer(ttsPlaybackReducer, initialTtsPlayback);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(1);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const blocksRef = useRef<EditorialSpeechBlock[]>([]);
  const blockIndexRef = useRef(0);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef(0);
  const mountedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const rateRef = useRef(1);
  const selectedVoiceUriRef = useRef("");

  const clearHighlight = useCallback(() => {
    activeElementRef.current?.removeAttribute("data-tts-active");
    activeElementRef.current?.removeAttribute("aria-current");
    activeElementRef.current = null;
  }, []);

  const highlightBlock = useCallback(
    (element: HTMLElement) => {
      clearHighlight();
      element.setAttribute("data-tts-active", "true");
      element.setAttribute("aria-current", "true");
      activeElementRef.current = element;
    },
    [clearHighlight],
  );

  const stop = useCallback(() => {
    sessionRef.current += 1;
    blockIndexRef.current = 0;
    clearHighlight();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    if (mountedRef.current) dispatch({ type: "STOP" });
  }, [clearHighlight]);

  useEffect(() => {
    mountedRef.current = true;
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
    dispatch({ type: supported ? "SUPPORTED" : "UNSUPPORTED" });

    const loadVoices = () => {
      if (!supported) return;
      const available = getPortugueseVoices(window.speechSynthesis.getVoices());
      voicesRef.current = available;
      setVoices(available);
      const storedVoice = readPreference(voiceStorageKey);
      const preferred =
        available.find((voice) => voice.voiceURI === selectedVoiceUriRef.current) ??
        available.find((voice) => voice.voiceURI === storedVoice) ??
        selectBrazilianPortugueseVoice(available);
      if (preferred) {
        selectedVoiceUriRef.current = preferred.voiceURI;
        setSelectedVoiceUri(preferred.voiceURI);
      }
    };

    if (supported) {
      const storedRate = Number(readPreference(rateStorageKey));
      if (readingRates.some((option) => option === storedRate)) {
        rateRef.current = storedRate;
        setRate(storedRate);
      }
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    const cancelOnPageExit = () => {
      sessionRef.current += 1;
      clearHighlight();
      if (supported) window.speechSynthesis.cancel();
    };
    window.addEventListener("pagehide", cancelOnPageExit);
    return () => {
      mountedRef.current = false;
      cancelOnPageExit();
      window.removeEventListener("pagehide", cancelOnPageExit);
      if (supported) window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [articleKey, clearHighlight]);

  const speakBlock = useCallback(
    (session: number, index: number) => {
      if (session !== sessionRef.current || !mountedRef.current) return;
      const block = blocksRef.current[index];
      if (!block) {
        stop();
        return;
      }

      blockIndexRef.current = index;
      highlightBlock(block.element);
      dispatch({ type: "START_AT", index, total: blocksRef.current.length });
      const utterance = new window.SpeechSynthesisUtterance(block.text);
      utterance.lang = "pt-BR";
      utterance.rate = rateRef.current;
      utterance.voice =
        voicesRef.current.find((voice) => voice.voiceURI === selectedVoiceUriRef.current) ??
        selectBrazilianPortugueseVoice(voicesRef.current) ??
        null;
      utterance.onstart = () => {
        if (session === sessionRef.current && mountedRef.current)
          dispatch({ type: "START_AT", index, total: blocksRef.current.length });
      };
      utterance.onend = () => {
        if (session !== sessionRef.current || !mountedRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex < blocksRef.current.length) {
          blockIndexRef.current = nextIndex;
          dispatch({ type: "AUTO_NEXT" });
          speakBlock(session, nextIndex);
        } else stop();
      };
      utterance.onerror = () => {
        if (session === sessionRef.current && mountedRef.current) stop();
      };
      window.speechSynthesis.speak(utterance);
    },
    [highlightBlock, stop],
  );

  const startAt = useCallback(
    (requestedIndex: number) => {
      if (!contentRef.current) return;
      if (!blocksRef.current.length)
        blocksRef.current = extractEditorialSpeechBlocks(contentRef.current);
      if (!blocksRef.current.length) return;
      const index = Math.max(0, Math.min(requestedIndex, blocksRef.current.length - 1));
      const session = sessionRef.current + 1;
      sessionRef.current = session;
      blockIndexRef.current = index;
      window.speechSynthesis.cancel();
      window.setTimeout(() => speakBlock(session, index), 0);
    },
    [contentRef, speakBlock],
  );

  const active = playback.status === "playing" || playback.status === "paused";
  const play = useCallback(() => {
    if (playback.status === "idle") startAt(blockIndexRef.current);
  }, [playback.status, startAt]);
  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (active) startAt(blockIndexRef.current + direction);
    },
    [active, startAt],
  );
  const restartCurrentBlock = useCallback(() => {
    if (active) {
      dispatch({ type: "RESTART_CURRENT" });
      startAt(blockIndexRef.current);
    }
  }, [active, startAt]);

  const changeRate = useCallback(
    (value: string) => {
      const nextRate = Number(value);
      if (!readingRates.some((option) => option === nextRate)) return;
      rateRef.current = nextRate;
      setRate(nextRate);
      savePreference(rateStorageKey, String(nextRate));
      restartCurrentBlock();
    },
    [restartCurrentBlock],
  );

  const changeVoice = useCallback(
    (voiceUri: string) => {
      if (!voicesRef.current.some((voice) => voice.voiceURI === voiceUri)) return;
      selectedVoiceUriRef.current = voiceUri;
      setSelectedVoiceUri(voiceUri);
      savePreference(voiceStorageKey, voiceUri);
      restartCurrentBlock();
    },
    [restartCurrentBlock],
  );

  const pauseOrResume = useCallback(() => {
    if (playback.status === "playing") {
      window.speechSynthesis.pause();
      dispatch({ type: "PAUSE" });
    } else if (playback.status === "paused") {
      window.speechSynthesis.resume();
      dispatch({ type: "RESUME" });
    }
  }, [playback.status]);

  const unavailable = playback.status === "checking" || playback.status === "unsupported";
  const position =
    active && playback.total ? ` · bloco ${playback.index + 1} de ${playback.total}` : "";
  const status =
    playback.status === "playing"
      ? `Reproduzindo${position}`
      : playback.status === "paused"
        ? `Pausado${position}`
        : playback.status === "unsupported"
          ? "Seu navegador não oferece leitura em voz alta."
          : "Pronto para ouvir";

  return (
    <section
      aria-label="Leitor de texto do artigo"
      className={cn(
        "mb-8 rounded-md border bg-muted/30 p-4 transition-colors",
        active && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 font-serif font-semibold text-foreground">
            <Volume2 aria-hidden="true" className="size-5 text-primary" />
            Ouvir artigo
          </p>
          <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
            {status}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={play}
            disabled={unavailable || active}
            aria-label="Ouvir artigo"
          >
            <Play aria-hidden="true" />
            Ouvir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={!active || playback.index === 0}
            aria-label="Voltar ao bloco anterior"
          >
            <SkipBack aria-hidden="true" />
            Voltar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(1)}
            disabled={!active || playback.index >= playback.total - 1}
            aria-label="Avançar ao próximo bloco"
          >
            <SkipForward aria-hidden="true" />
            Avançar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={pauseOrResume}
            disabled={!active}
            aria-label={playback.status === "paused" ? "Continuar leitura" : "Pausar leitura"}
          >
            {playback.status === "paused" ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {playback.status === "paused" ? "Continuar" : "Pausar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={stop}
            disabled={!active}
            aria-label="Parar leitura e voltar ao primeiro bloco"
          >
            <Square aria-hidden="true" />
            Parar
          </Button>
          <Select value={String(rate)} onValueChange={changeRate} disabled={unavailable}>
            <SelectTrigger className="w-[5.75rem]" aria-label="Velocidade de leitura">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {readingRates.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {String(option).replace(".", ",")}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedVoiceUri || undefined}
            onValueChange={changeVoice}
            disabled={unavailable || voices.length === 0}
          >
            <SelectTrigger
              className="min-w-0 max-w-full flex-1 basis-44 sm:max-w-64"
              aria-label="Voz da leitura"
            >
              <SelectValue placeholder={voices.length ? "Voz" : "Voz automática"} />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
