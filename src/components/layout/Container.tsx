import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "main" | "article";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}
