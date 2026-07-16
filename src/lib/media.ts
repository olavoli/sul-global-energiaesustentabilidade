export function imageFallbackText(alt: string): string {
  return alt.trim() ? `Imagem indisponível: ${alt}` : "Imagem indisponível";
}
