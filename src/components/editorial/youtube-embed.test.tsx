import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { validateSafeMdx } from "../../../scripts/generate-content";
import { YouTubeEmbed } from "./YouTubeEmbed";

describe("YouTubeEmbed editorial", () => {
  test("usa modo de privacidade, lazy loading e não ativa autoplay", () => {
    const html = renderToStaticMarkup(
      <YouTubeEmbed
        videoId="dQw4w9WgXcQ"
        title="Demonstração acessível"
        source="Canal institucional"
      />,
    );

    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="Demonstração acessível"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('allowFullScreen=""');
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("youtube.com/embed");
  });

  test("é responsivo em desktop e mobile e apresenta legenda e origem opcionais", () => {
    const html = renderToStaticMarkup(
      <YouTubeEmbed
        videoId="dQw4w9WgXcQ"
        title="Demonstração"
        caption="Material complementar."
        source="Canal institucional"
      />,
    );

    expect(html).toContain("aspect-video w-full");
    expect(html).toContain('class="h-full w-full"');
    expect(html).toContain("Material complementar. · Vídeo: Canal institucional");
    expect(html).toContain('data-editorial-auxiliary="true"');
    expect(html).toContain('data-tts-exclude="true"');
  });

  test("está disponível na lista segura de componentes MDX", () => {
    expect(() =>
      validateSafeMdx('<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Demonstração" />', "artigo.mdx"),
    ).not.toThrow();
  });

  test("rejeita identificador inválido e título vazio", () => {
    expect(() =>
      renderToStaticMarkup(<YouTubeEmbed videoId="../../video" title="Vídeo" />),
    ).toThrow("videoId inválido");
    expect(() => renderToStaticMarkup(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="   " />)).toThrow(
      "title é obrigatório",
    );
  });
});
