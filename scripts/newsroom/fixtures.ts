import { sourceSchema, type NewsSource } from "./schema";

export const fixtureSources: NewsSource[] = [
  sourceSchema.parse({
    id: "fixture-rss-local",
    name: "Fixture RSS local sintética",
    homepage: "https://fixture.example.test/",
    sourceType: "research-institute",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["eficiência energética", "armazenamento"],
    trustTier: "contextual",
    active: true,
    termsNotes: "Fixture local; não representa uma fonte real.",
    copyrightNotes: "Conteúdo sintético criado apenas para testes.",
    collectionMethod: "local-fixture",
  }),
  sourceSchema.parse({
    id: "fixture-atom-local",
    name: "Fixture Atom local sintética",
    homepage: "https://fixture.example.test/",
    sourceType: "research-institute",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["energia solar", "Sul Global"],
    trustTier: "contextual",
    active: true,
    termsNotes: "Fixture local; não representa uma fonte real.",
    copyrightNotes: "Conteúdo sintético criado apenas para testes.",
    collectionMethod: "local-fixture",
  }),
];
