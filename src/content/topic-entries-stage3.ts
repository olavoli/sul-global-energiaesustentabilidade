/** Original editorial drafts, consulted 2026-11-27; no human approval is implied. */
export const stage3TopicEntries = [
  {
    termId: "tag:cobre",
    locale: "pt-BR",
    status: "approved",
    sourceCheckedAt: "2026-11-27",
    editorialReviewedAt: "2026-11-27",
    title: "Cobre",
    editorialClassification: "Materiais · Recursos minerais",
    readingNote:
      "Minério extraído, metal refinado e sucata recuperada são etapas diferentes da cadeia.",
    subtitle:
      "Da condução elétrica à reciclagem: por que o cobre é importante para a infraestrutura e quais limites acompanham seu uso.",
    definition: {
      title: "O que é cobre?",
      paragraphs: [
        "Cobre é um elemento metálico, representado por Cu. Sua elevada condutividade elétrica e térmica, combinada à ductilidade, permite fabricar fios e componentes que transportam corrente ou transferem calor. Essas propriedades ajudam a explicar sua presença em instalações elétricas e máquinas.",
      ],
      sourceIds: ["usgs-copper"],
    },
    sections: [
      {
        id: "propriedades",
        kind: "applications",
        title: "Um metal que conecta equipamentos",
        paragraphs: [
          "Fios, cabos, enrolamentos de motores e geradores são aplicações elétricas do cobre. A ductilidade facilita transformar o metal em fios; a condutividade favorece o transporte de corrente. A seleção de um condutor depende também do projeto, das condições de serviço e dos demais materiais disponíveis.",
        ],
        sourceIds: ["usgs-copper"],
      },
      {
        id: "minerio",
        kind: "production",
        title: "Do minério ao metal",
        paragraphs: [
          "O cobre é utilizado desde a Antiguidade, mas sua produção industrial envolve várias etapas. Para minérios sulfetados, uma rota reúne extração, concentração, fundição e refino. Há também rotas por lixiviação, conforme a composição do minério.",
          "Não se deve confundir a quantidade de minério movimentado com a de cobre produzido. A recuperação depende da jazida e das operações de concentração e refino empregadas.",
        ],
        sourceIds: ["usgs-copper"],
      },
      {
        id: "reciclagem",
        kind: "context",
        title: "Reciclar ajuda, mas não fecha a conta sozinho",
        paragraphs: [
          "Sobras de fabricação e produtos descartados podem retornar à cadeia como matéria-prima secundária. A contribuição real depende da coleta, da separação e do processamento: um produto ser reciclável não significa que todo o seu cobre será recuperado.",
          "A IEA identifica a reciclagem como forma de aliviar a necessidade de novas minas, sem eliminar completamente a produção primária. Por isso, prolongar a vida útil dos produtos e organizar sua destinação importa tanto quanto anunciar capacidade de reciclagem.",
        ],
        sourceIds: ["iea-recycling"],
      },
      {
        id: "impactos",
        kind: "challenges",
        title: "Os limites materiais da eletrificação",
        paragraphs: [
          "Mineração, refino e reciclagem têm impactos que precisam ser avaliados, não apagados pelo uso final do metal em tecnologias de energia. Gestão de resíduos e rastreabilidade são partes dessa avaliação.",
          "Mais eletrificação não significa disponibilidade ilimitada de materiais. O planejamento precisa considerar oferta, recuperação de sucata e infraestrutura industrial, sem tratar cenários de demanda como previsões inevitáveis.",
        ],
        sourceIds: ["iea-recycling"],
      },
    ],
    sources: [
      {
        id: "usgs-copper",
        citation:
          "United States Geological Survey. Copper Statistics and Information. National Minerals Information Center. Página institucional sem data de publicação indicada.",
        url: "https://www.usgs.gov/centers/national-minerals-information-center/copper-statistics-and-information/",
      },
      {
        id: "iea-recycling",
        citation:
          "International Energy Agency. Recycling of Critical Minerals: executive summary. Paris: IEA; 2024.",
        url: "https://www.iea.org/reports/recycling-of-critical-minerals/executive-summary",
      },
    ],
  },
  {
    termId: "tag:armazenamento-de-energia",
    locale: "pt-BR",
    status: "approved",
    sourceCheckedAt: "2026-11-27",
    editorialReviewedAt: "2026-11-27",
    title: "Armazenamento de energia",
    editorialClassification: "Energia · Armazenamento e redes",
    readingNote: "Potência, capacidade energética e duração respondem a perguntas diferentes.",
    subtitle:
      "Entenda o que um sistema pode guardar, com que rapidez pode entregar energia e por que potência, duração e eficiência não são sinônimos.",
    definition: {
      title: "O que significa armazenar energia?",
      paragraphs: [
        "Armazenar energia é conservar energia em uma forma que permita utilizá-la mais tarde. No sistema elétrico, isso pode envolver transformar eletricidade em energia química, potencial ou térmica e depois entregá-la na forma necessária à aplicação. Baterias são uma possibilidade, não a única.",
      ],
      sourceIds: ["doe-storage"],
    },
    sections: [
      {
        id: "grandezas",
        kind: "context",
        title: "Potência, energia e duração",
        paragraphs: [
          "Potência, medida em kW ou MW, indica a taxa de entrega de energia. Capacidade energética, em kWh ou MWh, indica a quantidade disponível. A duração em uma descarga constante é a razão entre energia utilizável e potência.",
          "Exemplo idealizado: um sistema com 4 MWh utilizáveis, descarregando a 1 MW, teria duração de quatro horas. Isso não informa, sozinho, tempo de resposta, eficiência ou vida útil. Energia nominal e energia efetivamente utilizável não devem ser confundidas.",
        ],
        sourceIds: ["eia-duration"],
      },
      {
        id: "tecnologias",
        kind: "applications",
        title: "Tecnologias para necessidades diferentes",
        paragraphs: [
          "Baterias armazenam energia por processos eletroquímicos. Usinas reversíveis utilizam água bombeada para um reservatório mais alto. Sistemas térmicos podem conservar calor para uso posterior. Essas soluções não são intercambiáveis sem considerar o serviço e a infraestrutura.",
          "Armazenamento pode deslocar o uso da energia para outro horário e ajudar a equilibrar oferta e demanda. A escolha depende, entre outros fatores, da potência exigida, da duração e do local de instalação.",
        ],
        sourceIds: ["doe-storage", "epa-storage"],
      },
      {
        id: "eficiencia",
        kind: "other",
        title: "Por que nem toda energia retorna",
        paragraphs: [
          "A eficiência de um ciclo completo compara a energia recuperada com a fornecida ao sistema dentro de uma fronteira definida. Há perdas de conversão e consumos auxiliares; não se deve pressupor rendimento de 100%. Comparar tecnologias exige usar fronteiras equivalentes.",
          "Duração mede tempo de entrega; eficiência compara recuperação de energia. São grandezas diferentes.",
        ],
        sourceIds: ["doe-storage"],
      },
      {
        id: "avaliacao",
        kind: "challenges",
        title: "Benefícios e impactos dependem da operação",
        paragraphs: [
          "Armazenar eletricidade não torna sua origem automaticamente renovável. As emissões associadas dependem também de como o sistema é carregado e operado. Fabricação, materiais e descarte acrescentam impactos próprios.",
          "Um projeto deve ser avaliado pelo serviço que entrega, pelos custos e pelos efeitos ambientais ao longo de sua utilização, em vez de apenas pela capacidade anunciada.",
        ],
        sourceIds: ["epa-storage"],
      },
    ],
    sources: [
      {
        id: "doe-storage",
        citation:
          "United States Department of Energy. Solar Integration: Solar Energy and Storage Basics. Página institucional sem data de publicação indicada.",
        url: "https://www.energy.gov/cmei/systems/solar-integration-solar-energy-and-storage-basics",
      },
      {
        id: "eia-duration",
        citation:
          "United States Energy Information Administration. Duration of utility-scale batteries depends on how they’re used. Today in Energy; 2022.",
        url: "https://www.eia.gov/todayinenergy/detail.php?id=51798",
      },
      {
        id: "epa-storage",
        citation:
          "United States Environmental Protection Agency. Electricity Storage. Página institucional.",
        url: "https://www.epa.gov/energy/electricity-storage",
      },
    ],
  },
  {
    termId: "tag:transicao-energetica",
    locale: "pt-BR",
    status: "approved",
    sourceCheckedAt: "2026-11-27",
    editorialReviewedAt: "2026-11-27",
    title: "Transição energética",
    editorialClassification: "Energia · Sociedade e políticas públicas",
    readingNote: "Tecnologia, infraestrutura e justiça social precisam ser avaliadas em conjunto.",
    subtitle:
      "Uma mudança de sistemas: tecnologias, redes, financiamento e decisões sociais que transformam a produção e o uso de energia.",
    definition: {
      title: "O que é transição energética?",
      paragraphs: [
        "Transição energética é a transformação das formas de produzir, transportar e utilizar energia. No debate climático contemporâneo, envolve reduzir emissões e dependência de combustíveis fósseis, combinando fontes de menores emissões, eficiência e mudanças nos usos finais. Não se resume a instalar uma nova tecnologia.",
      ],
      sourceIds: ["iea-outlook"],
    },
    sections: [
      {
        id: "sistema",
        kind: "context",
        title: "Geração é apenas uma parte do sistema",
        paragraphs: [
          "Eletrificar usos e ampliar a geração renovável exige compatibilizar redes, armazenamento e operação. A infraestrutura precisa conectar a produção aos consumidores e responder à variação de oferta e demanda.",
          "Por isso, comparar apenas o custo de uma usina não resolve toda a avaliação do sistema. Expansão da rede e integração das tecnologias também fazem parte das escolhas de investimento.",
        ],
        sourceIds: ["iea-outlook"],
      },
      {
        id: "financiamento",
        kind: "challenges",
        title: "Quem financia a transformação?",
        paragraphs: [
          "Projetos dependem de capital, regras e condições de financiamento. Uma tecnologia competitiva pode encontrar obstáculos onde o custo do capital é elevado ou há riscos difíceis de administrar.",
          "Financiamento público, privado e cooperação internacional têm papéis distintos. A análise deve considerar tanto a viabilidade do projeto quanto acesso à energia e benefícios para a população, sem confundir anúncio de recursos com investimento realizado.",
        ],
        sourceIds: ["iea-outlook", "irena-finance"],
      },
      {
        id: "dimensao-social",
        kind: "other",
        title: "Trabalho, território e participação",
        paragraphs: [
          "Os efeitos de uma mudança energética não se distribuem igualmente. A transição justa incorpora diálogo social, proteção social e trabalho decente às decisões, em vez de tratar essas questões como efeitos automáticos do crescimento tecnológico.",
          "A orientação da OIT destaca a participação de governos, trabalhadores e empregadores. No território, a avaliação precisa tornar visíveis as pessoas afetadas, além dos equipamentos instalados.",
        ],
        sourceIds: ["ilo-just-transition"],
      },
      {
        id: "criterios",
        kind: "applications",
        title: "Como avaliar propostas concretas",
        paragraphs: [
          "Uma leitura crítica pode perguntar quais emissões são reduzidas, qual infraestrutura falta, quem financia e como os grupos afetados participam. Essas perguntas ajudam a distinguir um projeto isolado de uma transformação consistente do sistema.",
          "Os cenários de instituições de energia descrevem caminhos condicionados a hipóteses e políticas. Não são garantias de que determinado resultado ocorrerá em um país ou região.",
        ],
        sourceIds: ["iea-outlook", "ilo-just-transition"],
      },
    ],
    sources: [
      {
        id: "iea-outlook",
        citation:
          "International Energy Agency. World Energy Outlook 2024: executive summary. Paris: IEA; 2024.",
        url: "https://www.iea.org/reports/world-energy-outlook-2024/executive-summary",
      },
      {
        id: "irena-finance",
        citation:
          "International Renewable Energy Agency. World Energy Transitions Outlook 2024: 1.5°C pathway. Abu Dhabi: IRENA; 2024. Trechos sobre financiamento.",
        url: "https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Nov/IRENA_World_energy_transitions_outlook_2024.pdf",
      },
      {
        id: "ilo-just-transition",
        citation:
          "International Labour Organization. Guidelines for a just transition towards environmentally sustainable economies and societies for all. Página de publicação; 2 fev. 2016.",
        url: "https://www.ilo.org/publications/guidelines-just-transition-towards-environmentally-sustainable-economies",
      },
    ],
  },
];
