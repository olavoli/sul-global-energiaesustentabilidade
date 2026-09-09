import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = "content/articles/o-ar-condicionado-que-funciona-sem-compressor.mdx";
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, articlePath);
const canonicalDocxPath =
  "docs/editorial/art-023-revisao/texto_refrigeracao_absorcao_revisado_v1.docx";
const expectedTable = [
  [
    "Sistema / Tecnologia",
    "Tipo de Ciclo",
    "COP Típico",
    "Fonte de Energia Principal",
    "Principais Vantagens",
    "Principais Desvantagens",
    "Principais Aplicações Industriais",
  ],
  [
    "1. Compressão de Vapor",
    "Mecânico (Ciclo Fechado)",
    "1,3",
    "Energia Elétrica (Nobre)",
    "Alta versatilidade operacional; elevado COP em ampla faixa de temperatura.",
    "Elevado consumo elétrico; utiliza refrigerantes químicos prejudiciais (CFC/HFC) se houver vazamentos.",
    "Climatização geral, conservação residencial, processos industriais de ultra-congelamento (-30 °C).",
  ],
  [
    "2. Absorção (Efeito Simples)",
    "Térmico/Termoquímico (Fechado)",
    "0,6",
    "Calor de Baixa Temp. (Solar/Resíduo)",
    "Silencioso, baixíssimo consumo elétrico, utiliza calor residual (<100°C) ou solar, fluidos verdes.",
    "Baixo COP se comparado ao mecânico; equipamentos volumosos e pesados; risco de cristalização no evaporador se água-LiBr.",
    "Climatização predial (par Água-LiBr), refrigeração industrial e fabricação de gelo (par Amônia-Água).",
  ],
  [
    "3. Absorção (Duplo Efeito)",
    "Térmico/Múltiplo Efeito (Fechado)",
    "1,2",
    "Calor de Média Temp. (Vapor/Caldeira)",
    "COP significativamente maior devido à integração energética interna de alta eficiência.",
    "Exige fontes térmicas de temperatura mais elevada (>120°C); maior complexidade e custo construtivo.",
    "Climatização predial centralizada de grande escala integrado a sistemas de cogeração/trigeração.",
  ],
  [
    "4. Refrigeração por Adsorção",
    "Térmico/Físico (Fechado)",
    "0,4",
    "Calor de Baixa Temp. (Resíduo/Solar)",
    "Dispensa bombas mecânicas e coluna retificadora; insensível a vibrações e inclinação.",
    "Baixo COP; baixa potência de refrigeração específica; operação de ciclo tipicamente intermitente.",
    "Refrigeração móvel em barcos, aeronaves, ônibus e pequenos sistemas solares domiciliares.",
  ],
  [
    "5. Refrigeração por Ar",
    "Ciclo Aberto ou Fechado",
    "0,1",
    "Trabalho Mecânico / Ar",
    "Extrema simplicidade mecânica, livre de fluidos refrigerantes poluentes, ar direto.",
    "COP extremamente baixo; inviável para grandes capacidades industriais devido à baixa condutividade térmica do ar.",
    "Sistemas aeronáuticos e resfriamento rápido localizado de pequenos volumes industriais.",
  ],
  [
    "6. Refrigeração por Água",
    "Troca Térmica / Evaporativo",
    "0,0",
    "Água Corrente / Torre",
    "Elevada eficiência de transferência térmica; ideal para dissipação de gigantescas cargas de calor.",
    "Consumo e dependência de grandes recursos hídricos; risco de corrosão e incrustação; controle ambiental rígido.",
    "Dissipação central de calor em refinarias, indústrias petroquímicas e condensadores de usinas termoelétricas.",
  ],
  [
    "7. Refrigeração Termoelétrica",
    "Efeito Peltier Direto",
    "0,2",
    "Energia Elétrica (Corrente Contínua)",
    "Sem partes móveis, totalmente silencioso, alta precisão de ajuste e controle localizado.",
    "Custo elevado por Watt de refrigeração; capacidade frigorífica severamente limitada.",
    "Resfriamento localizado de sensores de alta precisão, microprocessadores e instrumentação de laboratórios.",
  ],
] as const;

describe("ART-023 — integração canônica do DOCX revisado v1", () => {
  test("corpo editorial aprovado permanece congelado", () => {
    const body = parsed.body.replace(/\r\n/g, "\n").trim();
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "101c7788a3bb2b1c62fe5984e080d06c6f9a772d781ec30863714d7aa46db010",
    );
  });

  test("mantém categoria, quatro pontos e conteúdo técnico aprovado", async () => {
    expect(parsed.frontmatter.title).toBe("O ar-condicionado que funciona sem compressor");
    expect(parsed.frontmatter.category).toBe("funcional");
    expect(parsed.frontmatter.status).toBe("published");

    const compiled = await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkFrontmatter],
    });
    const { default: Content } = await run(String(compiled), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);

    expect((html.match(/<li>/g) ?? []).length).toBe(4);
    expect(html).toContain("H₂O-LiBr");
    expect(html).toContain("NH₃-H₂O");
    expect(html).toContain("0,87 kPa");
    expect(html).toContain("4–5°C");
    expect(html).toContain("0,6 a 0,8");
    expect(html).toContain("1,1 a 1,25");
    expect((source.match(/^## Fontes e referências$/gm) ?? []).length).toBe(0);
  });

  test("restaura a tabela vetorial do DOCX célula a célula na posição canônica", async () => {
    expect(createHash("sha256").update(readFileSync(canonicalDocxPath)).digest("hex")).toBe(
      "fb2bc78402929d0af88bd020046459bf01696fe2ccb4750fb519bb582487cc58",
    );
    const compiled = await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkFrontmatter],
    });
    const { default: Content } = await run(String(compiled), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);
    const cells = [...html.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((match) =>
      match[1]
        .replace(/<[^>]+>/g, "")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&")
        .replace(/\s+/g, " ")
        .trim(),
    );
    expect(cells).toEqual(expectedTable.flat());
    expect(source.indexOf("TABELA COMPARATIVA DE TECNOLOGIAS DE REFRIGERAÇÃO")).toBeGreaterThan(
      source.indexOf("Nesses casos, o denominador comum"),
    );
    expect(
      source.indexOf("## Então por que nossas casas continuam usando compressor?"),
    ).toBeGreaterThan(source.indexOf("</EditorialTable>"));
  });

  test("usa a transparência editorial aprovada e a proveniência factual", () => {
    expect(parsed.frontmatter.aiDisclosure).toBe(
      "Nota de Transparência: Este artigo contou com o auxílio de ferramentas de Inteligência Artificial (ChatGPT) e imagens geradas por REVE (app.reve.com), com edições adicionais nas Figuras 2 e 3 realizadas por ferramenta de imagens da OpenAI, durante as etapas de: pesquisa inicial; estruturação de tópicos; e revisão gramatical. Todo o conteúdo factual foi verificado, expandido e editado por Olavo Oliveira, visando garantir a precisão das informações apresentadas.",
    );
  });

  test("usa somente as três imagens canônicas e separa crédito de proveniência", () => {
    expect(parsed.frontmatter.cover.src).toContain("art-023-hero.png");
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "Reve (app.reve.com)" },
    ]);
    expect((source.match(/<Figure\b/g) ?? []).length).toBe(2);
    expect((source.match(/aiCreditYear="2026"/g) ?? []).length).toBe(2);
    expect((source.match(/aiGenerationTool="Reve \(app\.reve\.com\)"/g) ?? []).length).toBe(2);
    expect(
      (source.match(/aiEditingTool="Ferramenta de imagens do Codex \(OpenAI\)"/g) ?? []).length,
    ).toBe(2);
    expect(source).toContain("art-023-figura-2-corrigida-v1.png");
    expect(source).toContain("art-023-figura-3-corrigida-v2.png");
    expect(source).not.toContain("art-023-imagem-2-corrigida-v1");
    expect(source).not.toContain("Fonte: SGES, (2026).");
  });

  test("não inclui VideoCard sem vídeo aprovado", () => {
    expect(source).not.toContain("<VideoCard");
    expect(source).not.toContain("<YouTubeEmbed");
    expect(source).not.toContain("youtube.com");
  });
});
