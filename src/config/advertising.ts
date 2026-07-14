export type AdSlotPosition = "home-inline" | "article-inline" | "article-end";

export interface AdSlotDefinition {
  name: string;
  position: AdSlotPosition;
  minHeight: number;
}

/** Advertising remains disabled until a real provider and policy are approved. */
export const advertisingConfig = Object.freeze({ enabled: false });
