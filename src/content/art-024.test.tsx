import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = "content/articles/a-chamine-que-produz-eletricidade-com-o-calor-do-sol.mdx";
const canonicalDocxPath =
  "docs/editorial/art-024-revisao/torre_solar_corrente_ascendente_revisado_v3.docx";
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, articlePath);

const expectedTables = [
  [
    [
      "País / Protótipo",
      "Altura da Chaminé",
      "Diâmetro da Chaminé",
      "Dimensão do coletor",
      "Principais Características e Inovações",
    ],
    [
      "Espanha (Manzanares, 1982)",
      "~195 m",
      "10 m",
      "~46.000 m²",
      "Demonstração experimental. 50 kW pico. Chaminé metálica estaiada. Validou operação noturna e uso agrícola.",
    ],
    [
      "Jordânia (Mutah, 2009)",
      "4 m",
      "0,58 m",
      "36 m²",
      "Modelo de bancada universitária. Cobertura plástica. Foco em monitoramento de variáveis sob alta radiação local.",
    ],
    [
      "China (Wuhan, 2002)",
      "8 m",
      "0,3 m",
      "10 m (diâmetro)",
      "Validação de modelos CFD (Dinâmica dos Fluidos). Coletor de vidro.",
    ],
    [
      "China (Nanjing - Micro)",
      "2,5 m",
      "-",
      "-",
      "Foco em dessalinização de água integrada à chaminé.",
    ],
    [
      "Turquia (Adıyaman, 2010)",
      "17,15 m",
      "0,8 m",
      "27 m (diâmetro)",
      "Estudo de campo de temperatura. Cobertura de vidro.",
    ],
    [
      "Turquia (Izmit/Isparta)",
      "2 m / 15 m",
      "-",
      "-",
      "Protótipos anteriores (1985/2004) para testes iniciais de gradiente térmico.",
    ],
  ],
  [
    ["Critério", "Prós (Vantagens)", "Contras (Desvantagens)"],
    [
      "Armazenamento de Energia",
      "A inércia térmica do solo pode estender a geração após o pôr do sol sem baterias eletroquímicas.",
      "A duração e a potência dependem da condutividade e da capacidade térmica do solo; não oferece despacho rápido comparável ao de baterias.",
    ],
    [
      "Complexidade e Manutenção",
      "Poucas partes móveis principais e ausência de combustível durante a geração.",
      "A limpeza e manutenção de grandes áreas de cobertura, turbinas e estruturas podem ser logisticamente complexas.",
    ],
    [
      "Eficiência de Conversão",
      "Funciona com radiação difusa e direta; não requer rastreamento solar preciso ou espelhos caros.",
      "Baixa eficiência solar-elétrica e necessidade de grandes áreas para potência significativa.",
    ],
    [
      "Custo de Capital (CAPEX)",
      "Ausência de custo de combustível durante a geração e longa vida potencial da estrutura civil.",
      "Investimento inicial elevado e risco técnico associado a uma torre e a um coletor de grandes dimensões.",
    ],
    [
      "Uso do Solo",
      "Uso duplo: O terreno sob o coletor pode ser usado para agricultura (estufa) ou secagem, como testado em Manzanares.",
      "Ocupação territorial imensa; impacto visual significativo; competição com outros usos do solo em regiões não desérticas.",
    ],
    [
      "Durabilidade",
      "Coberturas de vidro podem oferecer maior resistência à degradação ultravioleta que determinados filmes plásticos.",
      "Torres muito altas apresentam desafios estruturais; corrosão, vento e manutenção dos elementos de suporte exigem controle rigoroso.",
    ],
    [
      "Integração e Hibridização",
      "Potencial de integração experimental com dessalinização, outras fontes térmicas ou uso de encostas.",
      "A competitividade depende de hipóteses de escala, localização e financiamento ainda não demonstradas comercialmente.",
    ],
  ],
] as const;

async function renderArticle() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const { default: Content } = await run(String(compiled), runtime);
  return renderToStaticMarkup(<Content components={editorialMdxComponents} />);
}

describe("ART-024 — preparação canônica do DOCX revisado v3", () => {
  test("mantém o DOCX canônico e o corpo MDX congelados", () => {
    expect(createHash("sha256").update(readFileSync(canonicalDocxPath)).digest("hex")).toBe(
      "6e66c01029cdb4c6848e2de4a0d7b8e7cb381362aa25aa3c0869b5953264958a",
    );
    expect(
      createHash("sha256").update(parsed.body.replace(/\r\n/g, "\n").trim()).digest("hex"),
    ).toBe("c26417966a15ecf6798bdd8e6fb31aec5b707f42e4c64d654ba455e0ffc25df2");
  });

  test("preserva categoria, quatro pontos-chave, listas e formatação semântica", async () => {
    expect(parsed.frontmatter.category).toBe("funcional");
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.aiDisclosure).toBe(
      "Nota de Transparência: Este artigo contou com o auxílio de ferramentas de Inteligência Artificial (ChatGPT), incluindo a geração de imagens, durante as etapas de: pesquisa inicial; estruturação de tópicos; e revisão gramatical. Todo o conteúdo factual foi verificado, expandido e editado por Olavo Oliveira, visando garantir a precisão das informações apresentadas.",
    );

    const html = await renderArticle();
    expect((html.match(/<li>/g) ?? []).length).toBe(22);
    expect(html).toContain("<em>smoke jack</em>");
    expect(html).toContain("<em>updraft</em>");
    expect(html).toContain("46.000 m²");
    expect(html).toContain("1.000 metros");
    expect(html).toContain("100 MW");
  });

  test("preserva as tabelas 7×5 e 8×3 célula a célula e na ordem do DOCX", async () => {
    const html = await renderArticle();
    const renderedTables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map((table) =>
      [...table[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) =>
        cell[1]
          .replace(/<[^>]+>/g, "")
          .replaceAll("&amp;", "&")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    expect(renderedTables).toEqual(expectedTables.map((table) => table.flat()));
    expect(source.indexOf("Comparativo de protótipos")).toBeGreaterThan(
      source.indexOf("eles não equivalem a usinas comerciais"),
    );
    expect(source.indexOf("Destaques Regionais:")).toBeGreaterThan(
      source.indexOf("</EditorialTable>"),
    );
  });

  test("usa somente as três imagens canônicas com proveniência ChatGPT/OpenAI", () => {
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "ChatGPT/OpenAI" },
    ]);
    expect(parsed.frontmatter.cover.caption).toContain("Representação conceitual");
    expect((source.match(/<Figure\b/g) ?? []).length).toBe(2);
    expect((source.match(/aiGenerationTool="ChatGPT\/OpenAI"/g) ?? []).length).toBe(2);
    expect((source.match(/aiCreditYear="2026"/g) ?? []).length).toBe(2);
    expect(source).toContain("art-024-figura-2-cronologia-v2.png");
    expect(source).toContain("art-024-figura-3-funcionamento-v1.png");
    expect(source).not.toContain("Reve");
    expect(source).not.toContain("Fonte: SGES, (2026).");
  });

  test("preserva integralmente as referências e aplica literalmente a nota canônica", () => {
    expect((source.match(/^## Fontes e referências$/gm) ?? []).length).toBe(0);
    expect(source).toContain("Zhou, X., & Xu, Y. (2016)");
    expect(source).toContain("Al-Dabbas, M. A. (2012)");
    expect(source).toContain("Zuo, L., Yuan, Y., Li, Z., & Zheng, Y. (2012)");
    expect(source).toContain("Buğutekin, A. (2012)");
    expect(parsed.frontmatter.aiDisclosure).toBe(
      "Nota de Transparência: Este artigo contou com o auxílio de ferramentas de Inteligência Artificial (ChatGPT), incluindo a geração de imagens, durante as etapas de: pesquisa inicial; estruturação de tópicos; e revisão gramatical. Todo o conteúdo factual foi verificado, expandido e editado por Olavo Oliveira, visando garantir a precisão das informações apresentadas.",
    );
  });
});
