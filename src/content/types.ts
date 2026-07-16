import type { ComponentType } from "react";

export type EditorialMdxComponents = Record<string, unknown>;
export interface MdxModule {
  default: ComponentType<{ components?: EditorialMdxComponents }>;
}
export type MdxModuleLoader = () => Promise<MdxModule>;
