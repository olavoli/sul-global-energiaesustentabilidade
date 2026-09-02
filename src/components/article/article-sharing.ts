export function buildArticleShareUrls(title: string, shareUrl: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
  };
}

export async function copyArticleLink(clipboard: Pick<Clipboard, "writeText">, shareUrl: string) {
  await clipboard.writeText(shareUrl);
}
