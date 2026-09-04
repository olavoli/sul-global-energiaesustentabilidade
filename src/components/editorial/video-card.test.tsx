import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { validateSafeMdx } from "../../../scripts/generate-content";
import { VideoCard } from "./VideoCard";

const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("VideoCard editorial", () => {
  test("abre o vídeo original com proteção de nova aba e mantém a URL visível", () => {
    const html = renderToStaticMarkup(
      <VideoCard url={videoUrl} title="Carneiro hidráulico em funcionamento" source="Epagri" />,
    );

    expect(html).toContain(`href="${videoUrl.replaceAll("&", "&amp;")}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(`Vídeo: <a href="${videoUrl.replaceAll("&", "&amp;")}"`);
    expect(html).toContain("Fonte/Canal: Epagri");
    expect(html).not.toContain("iframe");
  });

  test("é responsivo, acessível e excluído do TTS", () => {
    const html = renderToStaticMarkup(
      <VideoCard
        url={videoUrl}
        title="Carneiro hidráulico em funcionamento"
        thumbnail="/images/art-022/carneiro-video.webp"
      />,
    );

    expect(html).toContain("aspect-video w-full");
    expect(html).toContain(
      'aria-label="Abrir vídeo no YouTube: Carneiro hidráulico em funcionamento"',
    );
    expect(html).toContain('data-editorial-auxiliary="true"');
    expect(html).toContain('data-tts-exclude="true"');
    expect(html).toContain('src="/images/art-022/carneiro-video.webp"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("sm:size-16");
  });

  test("não solicita thumbnail remota quando ela não é fornecida", () => {
    const html = renderToStaticMarkup(<VideoCard url={videoUrl} title="Demonstração" />);

    expect(html).not.toContain("<img");
    expect(html).not.toContain("i.ytimg.com");
    expect(html).not.toContain("youtube-nocookie.com");
  });

  test("está disponível na lista segura de componentes MDX", () => {
    expect(() =>
      validateSafeMdx(
        `<VideoCard url="${videoUrl}" title="Demonstração" source="Canal" />`,
        "artigo.mdx",
      ),
    ).not.toThrow();
  });

  test("rejeita URL externa, protocolo inseguro e título vazio", () => {
    expect(() =>
      renderToStaticMarkup(<VideoCard url="https://example.com/video" title="Vídeo" />),
    ).toThrow("URL HTTPS do YouTube");
    expect(() =>
      renderToStaticMarkup(<VideoCard url="http://www.youtube.com/watch?v=test" title="Vídeo" />),
    ).toThrow("URL HTTPS do YouTube");
    expect(() => renderToStaticMarkup(<VideoCard url={videoUrl} title="   " />)).toThrow(
      "title é obrigatório",
    );
  });
});
