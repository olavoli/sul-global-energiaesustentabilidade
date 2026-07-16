export interface BudgetCheck {
  reached: boolean;
  reason?: string;
}

export function checkBudget(name: string, current: number, limit: number): BudgetCheck {
  if (current < limit) return { reached: false };
  return { reached: true, reason: `budget:${name}` };
}
