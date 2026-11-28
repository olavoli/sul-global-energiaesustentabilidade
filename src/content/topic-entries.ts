import { z } from "zod";
import { stage3TopicEntries } from "./topic-entries-stage3";
import { taxonomyCatalog } from "./taxonomy-catalog";

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + "T00:00:00Z");
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Data inválida.");
const sourceSchema = z.object({
  id,
  citation: z.string().min(10),
  url: z
    .string()
    .url()
    .refine((url) => new URL(url).protocol === "https:"),
});
const textBlock = z.object({
  paragraphs: z.array(z.string().min(25)).min(1),
  sourceIds: z.array(id).min(1),
});
const sectionSchema = textBlock.extend({
  id,
  kind: z.enum(["production", "context", "applications", "challenges", "example", "other"]),
  title: z.string().min(5),
});
export const topicEntrySchema = z
  .object({
    termId: z.string(),
    locale: z.literal("pt-BR"),
    status: z.enum(["prototype", "approved"]),
    sourceCheckedAt: date,
    editorialReviewedAt: date.nullable(),
    title: z.string().min(3),
    editorialClassification: z.string().trim().min(3).max(90),
    subtitle: z.string().min(30),
    readingNote: z.string().min(20).optional(),
    definition: textBlock.extend({ title: z.string().min(5) }),
    sections: z.array(sectionSchema).min(1),
    sources: z.array(sourceSchema).min(1),
  })
  .superRefine((entry, ctx) => {
    if (!taxonomyCatalog.some((term) => term.kind === "tag" && term.id === entry.termId))
      ctx.addIssue({ code: "custom", message: "Identificador de tag inexistente." });
    if (entry.status === "approved" && !entry.editorialReviewedAt)
      ctx.addIssue({
        code: "custom",
        message: "Verbete aprovado exige data da revisão editorial.",
      });
    const sources = new Set(entry.sources.map((source) => source.id));
    if (sources.size !== entry.sources.length)
      ctx.addIssue({ code: "custom", message: "Fonte duplicada." });
    const sections = entry.sections.map((section) => section.id);
    if (
      new Set(sections).size !== sections.length ||
      sections.some((name) => ["definicao", "fontes", "artigos-relacionados"].includes(name))
    )
      ctx.addIssue({ code: "custom", message: "Seção duplicada ou identificador reservado." });
    for (const block of [entry.definition, ...entry.sections])
      for (const sourceId of block.sourceIds)
        if (!sources.has(sourceId))
          ctx.addIssue({ code: "custom", message: "Citação sem fonte cadastrada." });
  });
export type TopicEntry = z.infer<typeof topicEntrySchema>;

/** Four entries approved by the editorial owner in this conversation on 2026-11-27. */
export const topicEntries: readonly TopicEntry[] = [
  topicEntrySchema.parse({
    termId: "tag:hidrogenio-verde",
    locale: "pt-BR",
    status: "approved",
    sourceCheckedAt: "2026-11-27",
    editorialReviewedAt: "2026-11-27",
    title: "Hidrogênio verde",
    editorialClassification: "Energia · Hidrogênio e indústria",
    subtitle:
      "Entenda como o hidrogênio verde é produzido, onde pode ser utilizado e quais desafios ainda limitam sua expansão industrial.",
    definition: {
      title: "O que é hidrogênio verde?",
      paragraphs: [
        "Neste verbete, hidrogênio verde é o H₂ obtido por eletrólise da água com eletricidade de fontes renováveis. O termo descreve uma rota de produção; não significa ausência de impactos ambientais em toda a cadeia.",
      ],
      sourceIds: ["doe-electrolysis", "iea-emissions"],
    },
    sections: [
      {
        id: "producao",
        kind: "production",
        title: "Como é produzido?",
        paragraphs: [
          "No eletrolisador, a eletricidade permite separar água em hidrogênio e oxigênio. Há tecnologias com diferentes eletrólitos e condições de operação, como alcalina, membrana de troca de prótons (PEM) e óxido sólido.",
          "A eletrólise também pode usar eletricidade não renovável. Por isso, identificar o equipamento não basta: é necessário conhecer a origem da eletricidade utilizada.",
        ],
        sourceIds: ["doe-electrolysis"],
      },
      {
        id: "contexto",
        kind: "context",
        title: "Emissões diretas e ciclo de vida",
        paragraphs: [
          "O eletrolisador não emite CO₂ diretamente ao separar a água. Entretanto, a geração de eletricidade e a fabricação dos equipamentos podem gerar emissões. Avaliar o ciclo de vida exige explicitar quais etapas entram na conta.",
          "Converter e transportar hidrogênio também requer energia. O benefício climático depende da cadeia considerada e da alternativa substituída; não pode ser inferido apenas da palavra “verde”.",
        ],
        sourceIds: ["iea-emissions"],
      },
      {
        id: "aplicacoes",
        kind: "applications",
        title: "Aplicações industriais",
        paragraphs: [
          "O hidrogênio é usado no refino e como insumo para amônia e metanol. Também pode participar de rotas siderúrgicas. Substituir hidrogênio de origem fóssil por uma rota de menores emissões é uma possibilidade de descarbonização, condicionada ao processo completo.",
          "Combustíveis derivados e armazenamento energético são outras aplicações possíveis. Sua adequação deve considerar conversões, infraestrutura e perdas de energia, em vez de pressupor que o hidrogênio seja a melhor solução para todos os usos.",
        ],
        sourceIds: ["iea-future", "iea-emissions"],
      },
      {
        id: "desafios",
        kind: "challenges",
        title: "Desafios técnicos, ambientais e econômicos",
        paragraphs: [
          "Preço e origem da eletricidade, investimento em eletrolisadores e infraestrutura de entrega influenciam a viabilidade. Produção, transporte e demanda precisam ser coordenados.",
          "O desempenho ambiental depende da avaliação da cadeia. Já a viabilidade econômica depende também de compradores e condições de mercado: uma possibilidade tecnológica não equivale a uma operação comercial confirmada.",
        ],
        sourceIds: ["iea-future", "iea-emissions"],
      },
      {
        id: "exemplo-economico",
        kind: "example",
        title: "Exemplo econômico: somente a parcela elétrica",
        paragraphs: [
          "Hipóteses ilustrativas: consumo de 52 kWh de eletricidade por kg de H₂ e preço de R$ 300/MWh. Como 1 MWh corresponde a 1.000 kWh, a parcela elétrica seria 52 × 300 ÷ 1.000 = R$ 15,60/kg.",
          "O valor de 52 kWh/kg é uma premissa do exemplo, não um desempenho universal atribuído ao DOE ou à IEA. Assume-se que o consumo informado corresponde à energia elétrica contabilizada para a produção; consumos auxiliares não incluídos nessa fronteira exigiriam cálculo adicional.",
          "A conta não representa o custo total: não estima investimento, financiamento, água, manutenção, armazenamento ou transporte. Tampouco é uma tarifa vigente ou proposta comercial. A referência abaixo sustenta a importância da eletricidade e do investimento, não os números hipotéticos escolhidos.",
        ],
        sourceIds: ["iea-future"],
      },
    ],
    sources: [
      {
        id: "doe-electrolysis",
        citation:
          "United States Department of Energy. Hydrogen Production: Electrolysis. Atualizado em 13 out. 2026.",
        url: "https://www.energy.gov/cmei/fuels/hydrogen-production-electrolysis",
      },
      {
        id: "iea-emissions",
        citation:
          "International Energy Agency. Global Hydrogen Review 2024: GHG emissions of hydrogen and its derivatives. Paris: IEA; 2024.",
        url: "https://www.iea.org/reports/global-hydrogen-review-2024/ghg-emissions-of-hydrogen-and-its-derivatives",
      },
      {
        id: "iea-future",
        citation:
          "International Energy Agency. The Future of Hydrogen. Paris: IEA; 2019. Referência de fundamentos, não de estatísticas atuais.",
        url: "https://www.iea.org/reports/the-future-of-hydrogen",
      },
    ],
  }),
  ...stage3TopicEntries.map((entry) => topicEntrySchema.parse(entry)),
];
export function getTopicEntry(slug: string): TopicEntry | undefined {
  return topicEntries.find((entry) => entry.termId === "tag:" + slug);
}
