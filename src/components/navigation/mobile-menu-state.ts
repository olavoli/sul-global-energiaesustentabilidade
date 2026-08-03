export type MobileMenuAction = "open" | "close" | "toggle";

export function mobileMenuReducer(open: boolean, action: MobileMenuAction): boolean {
  if (action === "open") return true;
  if (action === "close") return false;
  return !open;
}
