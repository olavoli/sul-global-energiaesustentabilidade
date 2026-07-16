export interface TranslationProvider {
  id: "fixture" | "passthrough" | "external-placeholder";
  version: string;
  enabled: boolean;
  translate(text: string, sourceLanguage: string): Promise<string>;
}

const FIXTURES: Readonly<Record<string, string>> = {
  "How data centers can better manage energy use":
    "Como data centers podem gerenciar melhor o uso de energia",
  "MIT researchers develop a low-cost technique to get lithium out of rocks":
    "Pesquisadores do MIT desenvolvem técnica de baixo custo para extrair lítio de rochas",
  "Turning extreme heat into large-scale energy storage":
    "Transformando calor extremo em armazenamento de energia em grande escala",
};

export const fixtureProvider: TranslationProvider = {
  id: "fixture",
  version: "fixture-v1",
  enabled: true,
  async translate(text) {
    const translated = FIXTURES[text];
    if (!translated)
      throw new Error(
        "Provider fixture aceita somente as três entradas demonstrativas versionadas.",
      );
    return translated;
  },
};

export const passthroughProvider: TranslationProvider = {
  id: "passthrough",
  version: "passthrough-v1",
  enabled: true,
  async translate(text, sourceLanguage) {
    if (!sourceLanguage.toLowerCase().startsWith("pt"))
      throw new Error("Passthrough aceita somente conteúdo já em português.");
    return text;
  },
};

export const externalPlaceholderProvider: TranslationProvider = {
  id: "external-placeholder",
  version: "disabled-v1",
  enabled: false,
  async translate() {
    throw new Error(
      "Provider externo desabilitado: nenhuma API, SDK, chave ou chamada remota foi configurada.",
    );
  },
};

export function translationProvider(id: string): TranslationProvider {
  const providers = [fixtureProvider, passthroughProvider, externalPlaceholderProvider];
  const provider = providers.find((candidate) => candidate.id === id);
  if (!provider) throw new Error(`Provider desconhecido: ${id}.`);
  if (!provider.enabled) throw new Error("Provider externo está explicitamente desabilitado.");
  return provider;
}
