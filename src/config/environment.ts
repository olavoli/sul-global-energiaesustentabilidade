export const APP_ENVIRONMENTS = [
  "development",
  "preview",
  "staging",
  "production",
  "test",
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const LOCAL_SITE_URL = "http://localhost:8080";

export interface EnvironmentInput {
  appEnvironment?: string;
  publicSiteUrl?: string;
  allowDemoContent?: string;
  mode?: string;
  isDevelopment?: boolean;
}

export interface EnvironmentConfig {
  name: AppEnvironment;
  publicSiteUrl: string;
  isPublicUrlConfigured: boolean;
  isOfficialProduction: boolean;
  isStaging: boolean;
  indexingEnabled: boolean;
  demoContentEnabled: boolean;
}

export function normalizeSiteUrl(value: string | undefined): string {
  const configured = value?.trim() || LOCAL_SITE_URL;
  try {
    return new URL(configured).toString().replace(/\/$/, "");
  } catch {
    throw new Error("VITE_PUBLIC_SITE_URL deve ser uma URL absoluta válida.");
  }
}

function resolveName(input: EnvironmentInput): AppEnvironment {
  const explicitName = input.appEnvironment?.trim();
  if (explicitName) {
    if (!APP_ENVIRONMENTS.includes(explicitName as AppEnvironment)) {
      throw new Error(`VITE_APP_ENV inválido: ${explicitName}.`);
    }
    return explicitName as AppEnvironment;
  }
  if (input.mode === "test") return "test";
  if (input.isDevelopment) return "development";
  return "preview";
}

/** Resolve public runtime behavior without treating a generic build as official production. */
export function resolveEnvironment(input: EnvironmentInput): EnvironmentConfig {
  const name = resolveName(input);
  const publicSiteUrl = normalizeSiteUrl(input.publicSiteUrl);
  const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(publicSiteUrl);
  const isPublicUrlConfigured = Boolean(input.publicSiteUrl?.trim()) && !isLocalUrl;
  const demoOptIn = input.allowDemoContent === "true";

  if (name === "production" && !isPublicUrlConfigured) {
    throw new Error("VITE_APP_ENV=production exige VITE_PUBLIC_SITE_URL pública e explícita.");
  }
  if (name === "production" && demoOptIn) {
    throw new Error("Produção oficial não permite VITE_ALLOW_DEMO_CONTENT=true.");
  }
  if (name === "staging" && !isPublicUrlConfigured) {
    throw new Error("VITE_APP_ENV=staging exige VITE_PUBLIC_SITE_URL HTTPS e explícita.");
  }
  if (name === "staging" && new URL(publicSiteUrl).protocol !== "https:") {
    throw new Error("Staging exige VITE_PUBLIC_SITE_URL com HTTPS.");
  }

  const isOfficialProduction = name === "production" && isPublicUrlConfigured && !demoOptIn;
  return Object.freeze({
    name,
    publicSiteUrl,
    isPublicUrlConfigured,
    isOfficialProduction,
    isStaging: name === "staging",
    indexingEnabled: isOfficialProduction,
    // Staging is an explicit, non-indexable demonstration environment.
    demoContentEnabled:
      name === "development" || name === "test" || name === "staging" || demoOptIn,
  });
}

export const environmentConfig = resolveEnvironment({
  appEnvironment: import.meta.env.VITE_APP_ENV,
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL,
  allowDemoContent: import.meta.env.VITE_ALLOW_DEMO_CONTENT,
  mode: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
});
