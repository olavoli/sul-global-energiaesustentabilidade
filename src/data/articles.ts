import type { Article } from "@/types/content";
import { authors } from "./authors";

/**
 * Editorial demo data for the Sul Global MVP.
 * All content is fictional but plausible — do not cite as fact.
 * Images use stable Unsplash asset IDs.
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=75&auto=format&fit=crop`;

export const articles: Article[] = [
  {
    id: "01",
    slug: "hidrogenio-verde-no-brasil-promessa-e-realidade",
    title: "Hidrogênio verde no Brasil: promessa e realidade",
    subtitle:
      "Entre o Porto do Pecém e os leilões de eletrólise, o país tenta transformar potencial eólico em molécula exportável.",
    excerpt:
      "Anúncios somam mais de 30 GW de capacidade planejada até 2030. O gap entre projetos e clientes, porém, ainda é a variável decisiva.",
    content: `A cerca de 60 quilômetros de Fortaleza, o Complexo Industrial e Portuário do Pecém tornou-se o cartão-postal do hidrogênio verde brasileiro. Na última contagem, mais de 30 memorandos de entendimento foram assinados entre operadores, produtores e potenciais compradores europeus e asiáticos.

## O que já foi assinado

Os memorandos não vinculam capital. Eles reservam área industrial e prioridade de acesso à rede — dois insumos que, no Brasil, se tornaram tão escassos quanto o próprio hidrogênio.

A capacidade planejada agregada supera 30 GW de eletrolisadores. Para contexto, a Alemanha inteira projeta 10 GW até 2030.

### Onde está o gargalo

O gargalo não é geração eólica. É demanda contratada em moeda forte, com prazo compatível com project finance de 15 anos. Sem contratos de longo prazo, os projetos não fecham a conta.

> "O hidrogênio verde brasileiro tem chance real, mas depende de o governo comprador escrever o cheque antes do capex ser mobilizado." — analista sênior de um banco de fomento europeu.

## Três variáveis para observar

- Regulação do marco legal do hidrogênio de baixa emissão.
- Taxonomia europeia e critério de adicionalidade elétrica.
- Custo do capital em real e a paridade com o dólar em contratos take-or-pay.

O Brasil tem vento, sol e porto. Falta demanda ancorada. Enquanto isso não se resolve, o hidrogênio verde continuará sendo mais promessa do que produto.`,
    coverImage: img("photo-1466611653911-95081537e5b7"),
    coverImageAlt:
      "Turbinas eólicas em campo aberto ao amanhecer, com nuvens baixas ao fundo",
    category: "transicao-energetica",
    tags: ["hidrogênio", "eletrólise", "exportação", "pecém"],
    author: authors["ana-souza"]!,
    publishedAt: "2026-07-08",
    readingTime: 9,
    featured: true,
    status: "published",
  },
  {
    id: "02",
    slug: "leilao-a-6-analise-resultado-preliminar",
    title: "Leilão A-6: análise do resultado preliminar",
    subtitle:
      "Solar fotovoltaica domina, eólica onshore recua e térmicas a gás voltam a aparecer como back-up estrutural.",
    excerpt:
      "A composição do leilão indica um sistema elétrico em transição — não apenas de fonte, mas de função.",
    content: `A ANEEL divulgou o resultado preliminar do leilão A-6 e a leitura, embora esperada em traços, surpreende no detalhe. Solar fotovoltaica contratou o maior volume, cerca de 65% da energia habilitada.

## A distribuição por fonte

O resultado consolida uma tendência: solar ganha por preço, eólica onshore perde competitividade em regiões saturadas, e térmica a gás natural volta ao mix — não como base, mas como firmness estrutural.

## Preço-teto e realidade de capex

O preço-teto foi respeitado por larga margem em solar, o que sinaliza espaço para novos ajustes regulatórios. Em eólica, a compressão já preocupa: dos 4,3 GW habilitados, apenas 1,1 GW foi vendido.

O que isso diz sobre 2027? Que o próximo leilão vai precisar tratar o problema da inflexibilidade — fonte por fonte — antes de olhar apenas o preço.`,
    coverImage: img("photo-1509391366360-2e959784a276"),
    coverImageAlt:
      "Fileiras de painéis solares fotovoltaicos vistas de cima",
    category: "energia",
    tags: ["leilão", "aneel", "solar", "eólica"],
    author: authors["ana-souza"]!,
    publishedAt: "2026-07-05",
    readingTime: 7,
    featured: true,
    status: "published",
  },
  {
    id: "03",
    slug: "baterias-de-sodio-a-nova-fronteira-do-armazenamento",
    title: "Baterias de sódio: a nova fronteira do armazenamento",
    subtitle:
      "Densidade menor, mas cadeia de suprimentos independente de lítio. É o suficiente para escalar?",
    excerpt:
      "Fabricantes chineses e europeus estão apostando alto. A discussão técnica, no entanto, ainda está longe de resolvida.",
    content: `Baterias de sódio-íon usam um metal abundante, barato e distribuído geograficamente. Isso resolve, no papel, um dos gargalos estruturais do lítio: concentração geopolítica da cadeia.

## O trade-off que ninguém contorna

A densidade energética por quilograma ainda é significativamente menor que a do lítio-íon. Para veículos elétricos leves, isso é um problema real. Para armazenamento estacionário, é quase irrelevante.

### Onde faz sentido

- Estabilização de rede em usinas solares grandes.
- Sistemas híbridos com eólica em regiões isoladas.
- BESS residencial em mercados com forte sazonalidade.

A tese não é substituir o lítio. É segmentar o mercado por caso de uso.`,
    coverImage: img("photo-1518709268805-4e9042af9f23"),
    coverImageAlt:
      "Laboratório de eletroquímica com bancada de células de bateria em teste",
    category: "tecnologia",
    tags: ["baterias", "sódio", "armazenamento", "bess"],
    author: authors["clara-mendes"]!,
    publishedAt: "2026-07-02",
    readingTime: 8,
    featured: false,
    status: "published",
  },
  {
    id: "04",
    slug: "amazonia-mercado-de-carbono-e-o-risco-de-integridade",
    title: "Amazônia, mercado de carbono e o risco de integridade",
    subtitle:
      "A regulamentação nacional avança, mas o mercado voluntário continua com problemas de metodologia e sobreposição.",
    excerpt:
      "Sem baseline confiável e verificação independente, o crédito florestal vira commodity de reputação frágil.",
    content: `O Brasil aprovou, no ano passado, o marco legal do mercado regulado de carbono. Esse é o palco principal. O mercado voluntário, no entanto, é onde se joga o dinheiro do curto prazo — e onde estão as controvérsias.

## O problema da baseline

Muitos projetos REDD+ na Amazônia foram criticados por adotar linhas de base infladas. Se a taxa de desmatamento projetada é maior que a real, o crédito emitido é maior que a redução efetivamente ocorrida.

> "Mercado sem integridade metodológica é uma bolha em câmera lenta." — pesquisador sênior de política climática.

## O que muda com o mercado regulado

O sistema brasileiro de comércio de emissões, em consulta pública, prevê registro central, verificação obrigatória e sobreposição controlada com o voluntário. Isso não elimina o risco, mas o encapsula.`,
    coverImage: img("photo-1441974231531-c6227db76b6e"),
    coverImageAlt: "Copa da floresta amazônica vista do alto com névoa matinal",
    category: "sustentabilidade",
    tags: ["carbono", "amazônia", "redd+", "regulação"],
    author: authors["diego-rocha"]!,
    publishedAt: "2026-06-28",
    readingTime: 10,
    featured: false,
    status: "published",
  },
  {
    id: "05",
    slug: "supercondutores-a-temperatura-ambiente-uma-decada-depois",
    title: "Supercondutores à temperatura ambiente, uma década depois",
    subtitle:
      "O que a comunidade de física de matéria condensada aprendeu com os anúncios frustrados de 2023 a 2025.",
    excerpt:
      "A ciência avançou mais nos protocolos de replicação do que nos materiais em si.",
    content: `Depois da onda de anúncios controversos entre 2023 e 2025, a comunidade internacional adotou protocolos rigorosos de replicação. Nenhum material demonstrou supercondutividade acima de 250 K com verificação independente completa.

## O que ficou de bom

- Padrões abertos de medida magnética e elétrica.
- Bases de dados públicas com amostras replicadas.
- Financiamento condicionado à submissão de amostras a laboratórios independentes.

A busca por temperaturas mais altas continua. Mas a régua mudou.`,
    coverImage: img("photo-1532187863486-abf9dbad1b69"),
    coverImageAlt: "Bancada de laboratório com criostato e instrumentos de medida",
    category: "ciencia",
    tags: ["supercondutores", "física", "materiais"],
    author: authors["bruno-carvalho"]!,
    publishedAt: "2026-06-25",
    readingTime: 6,
    featured: false,
    status: "published",
  },
  {
    id: "06",
    slug: "redes-inteligentes-e-o-desafio-do-consumidor-ativo",
    title: "Redes inteligentes e o desafio do consumidor ativo",
    subtitle:
      "Micro geração distribuída ultrapassou 40 GW no país. A rede não foi desenhada para isso.",
    excerpt:
      "O consumidor virou usina. O regulador ainda decide se isso é bom.",
    content: `A geração distribuída fotovoltaica no Brasil ultrapassou 40 GW instalados. Em algumas regiões, o fluxo reverso nos alimentadores de baixa tensão já é rotina.

## O problema técnico

Redes de distribuição foram projetadas para fluxo unidirecional. Fluxo reverso muda o perfil de tensão, exige recondutoração e reconfigura a operação em regime permanente.

## O problema regulatório

O modelo tarifário atual não separa custo de energia de custo de rede. Enquanto isso não é resolvido, subsídio cruzado entre consumidores continua.`,
    coverImage: img("photo-1473341304170-971dccb5ac1e"),
    coverImageAlt:
      "Torres de transmissão elétrica ao entardecer com céu alaranjado",
    category: "tecnologia",
    tags: ["smart grid", "geração distribuída", "tarifa"],
    author: authors["clara-mendes"]!,
    publishedAt: "2026-06-22",
    readingTime: 8,
    featured: false,
    status: "published",
  },
  {
    id: "07",
    slug: "financiamento-verde-e-o-custo-do-capital-no-sul-global",
    title: "Financiamento verde e o custo do capital no Sul Global",
    subtitle:
      "O prêmio de risco emergente continua sendo o maior obstáculo à transição energética justa.",
    excerpt:
      "Sem redução do spread soberano, taxonomias verdes viram exercício retórico.",
    content: `O custo de capital determina o que se constrói. Em países do Sul Global, o spread soberano encarece project finance em setores intensivos em capex — precisamente onde a transição energética precisa acontecer.

## O que os multilaterais estão testando

Instrumentos de blended finance com garantia parcial de crédito reduziram, em alguns projetos-piloto, o custo de capital em 200 a 300 pontos-base. A escala, no entanto, é modesta.

A transição energética justa precisa endereçar o custo do dinheiro antes de discutir tecnologia.`,
    coverImage: img("photo-1554224155-6726b3ff858f"),
    coverImageAlt:
      "Gráficos financeiros em tela de terminal, com foco em análise de risco",
    category: "desenvolvimento",
    tags: ["finanças", "blended finance", "capital", "sul global"],
    author: authors["eduarda-lima"]!,
    publishedAt: "2026-06-20",
    readingTime: 9,
    featured: false,
    status: "published",
  },
  {
    id: "08",
    slug: "eolica-offshore-brasileira-marco-regulatorio-em-construcao",
    title: "Eólica offshore brasileira: marco regulatório em construção",
    subtitle:
      "Projeto de lei tramita há três legislaturas. O potencial técnico é imenso; a jurisprudência, quase nula.",
    excerpt:
      "Sem regime de outorga claro, o Brasil corre risco de perder janela competitiva para vizinhos.",
    content: `O potencial técnico de eólica offshore no litoral brasileiro é estimado em mais de 700 GW. Nenhum megawatt foi ainda instalado.

## Três pontos travando o setor

- Regime de outorga (concessão versus autorização).
- Compartilhamento de dados oceanográficos.
- Sobreposição com áreas de defesa e pesca industrial.

O marco legal em tramitação endereça parte disso, mas silencia sobre pontos críticos de meio ambiente marinho.`,
    coverImage: img("photo-1508615039623-a25605d2b022"),
    coverImageAlt:
      "Parque eólico offshore em mar aberto sob céu nublado",
    category: "energia",
    tags: ["eólica offshore", "regulação", "outorga"],
    author: authors["ana-souza"]!,
    publishedAt: "2026-06-18",
    readingTime: 7,
    featured: false,
    status: "published",
  },
  {
    id: "09",
    slug: "captura-de-carbono-realidade-tecnica-ou-narrativa",
    title: "Captura de carbono: realidade técnica ou narrativa?",
    subtitle:
      "Projetos operacionais somam menos de 50 Mt/ano de CO2 removidos. A trajetória do IPCC pede 1.000 Mt/ano em 2035.",
    excerpt:
      "O gap entre discurso e capacidade instalada é a maior fragilidade dos cenários climáticos atuais.",
    content: `Existem hoje cerca de 40 instalações comerciais de captura e armazenamento de carbono em operação no mundo. Todas somadas removem menos de 50 megatoneladas de CO2 por ano.

## A ordem de grandeza que falta

Os cenários climáticos do IPCC compatíveis com 1,5°C exigem, em 2035, capacidade próxima a 1.000 megatoneladas por ano. É um fator 20 de crescimento em uma década.

> "Captura de carbono é necessária. Mas confiar em uma trajetória com fator 20 sem plano industrial é otimismo estruturado como política pública."

O ponto do artigo não é desqualificar a tecnologia. É calibrar expectativa.`,
    coverImage: img("photo-1611273426858-450d8e3c9fce"),
    coverImageAlt:
      "Infraestrutura industrial de captura de carbono com dutos e torres",
    category: "sustentabilidade",
    tags: ["ccs", "captura de carbono", "ipcc"],
    author: authors["diego-rocha"]!,
    publishedAt: "2026-06-14",
    readingTime: 8,
    featured: false,
    status: "published",
  },
  {
    id: "10",
    slug: "materiais-criticos-e-a-nova-geopolitica-mineral",
    title: "Materiais críticos e a nova geopolítica mineral",
    subtitle:
      "Lítio, cobalto, níquel e terras raras concentram tanto reserva quanto processamento. É um problema estrutural.",
    excerpt:
      "Não basta ter a mina. Sem refino doméstico, o valor agregado migra.",
    content: `A cadeia global de materiais críticos tem duas camadas: extração e refino. A concentração no refino, sobretudo na China, é o que define poder de mercado real.

## O caso do lítio

Austrália extrai boa parte do lítio primário do mundo, mas o refino em bateria-grade ocorre majoritariamente na China. O mesmo padrão se repete para cobalto e terras raras.

## Implicação para o Brasil

Reservas expressivas de nióbio, terras raras e lítio no país só têm valor estratégico se acompanhadas de política industrial de refino. Sem isso, a exportação de concentrado repete o modelo commodity.`,
    coverImage: img("photo-1518709594023-6eab9bab7b23"),
    coverImageAlt:
      "Mina a céu aberto com veículos pesados em operação",
    category: "desenvolvimento",
    tags: ["mineração", "lítio", "terras raras", "política industrial"],
    author: authors["eduarda-lima"]!,
    publishedAt: "2026-06-11",
    readingTime: 9,
    featured: false,
    status: "published",
  },
  {
    id: "11",
    slug: "fusao-nuclear-o-que-mudou-em-2026",
    title: "Fusão nuclear: o que mudou em 2026",
    subtitle:
      "Ganho líquido de energia foi replicado. Comercialização segue distante.",
    excerpt:
      "A física está mais madura. A engenharia de sistema, e o balanço energético total, ainda não.",
    content: `A replicação de experimentos de fusão inercial com ganho líquido de energia foi confirmada em pelo menos três instalações independentes. Isso muda o status científico do problema.

## Do laboratório ao reator

Ganho líquido em pulso único não é ganho líquido operacional. Um reator comercial precisa sustentar o pulso, capturar energia térmica, converter em eletricidade e sobreviver ao fluxo de nêutrons por décadas.

A comunidade estima primeiro reator piloto conectado à rede não antes de 2040 — cenário otimista.`,
    coverImage: img("photo-1451187580459-43490279c0fa"),
    coverImageAlt:
      "Instalação científica com câmara toroidal iluminada em azul",
    category: "ciencia",
    tags: ["fusão", "física de plasma", "iter"],
    author: authors["bruno-carvalho"]!,
    publishedAt: "2026-06-07",
    readingTime: 7,
    featured: false,
    status: "published",
  },
  {
    id: "12",
    slug: "transicao-energetica-justa-alem-do-slogan",
    title: "Transição energética justa, além do slogan",
    subtitle:
      "Requalificação de mão de obra fóssil, receita municipal e planejamento territorial são os três eixos que faltam.",
    excerpt:
      "O adjetivo justa deveria ser resultado, não retórica de abertura de painel.",
    content: `A expressão transição energética justa virou obrigatória em documentos de política pública. O conteúdo por trás dela varia muito.

## Três eixos concretos

- Requalificação de trabalhadores do setor fóssil.
- Substituição da receita municipal que depende de royalties.
- Planejamento territorial de novos empreendimentos renováveis.

Sem esses três eixos com métrica, prazo e orçamento, transição justa segue como intenção — e populações inteiras seguem como variável de ajuste.`,
    coverImage: img("photo-1497436072909-60f360e1d4b1"),
    coverImageAlt:
      "Trabalhador com capacete observando turbinas eólicas em construção",
    category: "transicao-energetica",
    tags: ["transição justa", "emprego", "política pública"],
    author: authors["eduarda-lima"]!,
    publishedAt: "2026-06-03",
    readingTime: 8,
    featured: false,
    status: "published",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug && a.status === "published");
}

export function getArticlesByCategory(slug: string): Article[] {
  return articles.filter(
    (a) => a.category === slug && a.status === "published",
  );
}

export function getPublishedArticles(): Article[] {
  return articles.filter((a) => a.status === "published");
}

export function getFeaturedArticles(): Article[] {
  return getPublishedArticles().filter((a) => a.featured);
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  return getPublishedArticles()
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, limit);
}

export function getLatestArticles(limit = 8): Article[] {
  return [...getPublishedArticles()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}