import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Sul Global Energia e Sustentabilidade — página inicial"
      className="group inline-flex items-center gap-2.5"
    >
      <img
        src="/images/brand/sul-global-energia-sustentabilidade.png"
        alt=""
        width={48}
        height={48}
        className="h-11 w-11 shrink-0 rounded-md bg-white object-contain sm:h-12 sm:w-12"
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="whitespace-nowrap font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Sul <span className="text-primary">Global</span>
        </span>
        {!compact && (
          <span className="mt-1 hidden whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Energia e Sustentabilidade
          </span>
        )}
      </span>
    </Link>
  );
}
