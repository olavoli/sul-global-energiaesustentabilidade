import { environmentConfig, normalizeSiteUrl } from "@/config/environment";

export { LOCAL_SITE_URL, normalizeSiteUrl } from "@/config/environment";

export function absoluteSiteUrl(pathOrUrl: string, baseUrl = normalizeSiteUrl(undefined)): string {
  return new URL(pathOrUrl, `${baseUrl}/`).toString();
}

const url = environmentConfig.publicSiteUrl;

export const siteConfig = Object.freeze({
  name: "Sul Global",
  description:
    "Reportagem e análise sobre energia, transição energética, sustentabilidade, ciência, tecnologia e desenvolvimento no Brasil e no mundo.",
  url,
  isPublicUrlConfigured: environmentConfig.isPublicUrlConfigured,
  indexingEnabled: environmentConfig.indexingEnabled,
  locale: "pt_BR",
  language: "pt-BR",
  // Ativo editorial provisório; requer validação do fundador antes do lançamento.
  socialImage: absoluteSiteUrl("/images/social/sul-global-editorial-placeholder.svg", url),
  socialImageAlt: "Sul Global — energia, ciência e desenvolvimento",
  socialImageWidth: 1200,
  socialImageHeight: 630,
});
