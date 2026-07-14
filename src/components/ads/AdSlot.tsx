import { advertisingConfig, type AdSlotDefinition } from "@/config/advertising";

/** Reserve labelled ad geometry only after advertising is explicitly enabled. */
export function AdSlot({ slot }: { slot: AdSlotDefinition }) {
  if (!advertisingConfig.enabled) return null;

  return (
    <aside
      aria-label="Publicidade"
      data-ad-slot={slot.name}
      data-ad-position={slot.position}
      className="flex w-full items-center justify-center border border-dashed border-border bg-muted/20 text-xs text-muted-foreground"
      style={{ minHeight: slot.minHeight }}
    >
      Publicidade
    </aside>
  );
}
