const LOCAL_SITE_URL = "http://localhost:8080";

function normalizeSiteUrl(value: string | undefined): string {
  const configured = value?.trim() || LOCAL_SITE_URL;

  try {
    return new URL(configured).toString().replace(/\/$/, "");
  } catch {
    throw new Error("VITE_PUBLIC_SITE_URL deve ser uma URL absoluta válida.");
  }
}

export const siteConfig = Object.freeze({
  name: "Sul Global",
  description:
    "Reportagem e análise sobre energia, transição energética, sustentabilidade, ciência, tecnologia e desenvolvimento no Brasil e no mundo.",
  url: normalizeSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL),
  locale: "pt_BR",
  language: "pt-BR",
  socialImage:
    "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ecdd5255-e352-449d-84e7-063e031eb66e/id-preview-61a50d2d--d78e60f8-5227-4fec-bdb1-b9e83ed374e0.lovable.app-1783794466980.png",
});
