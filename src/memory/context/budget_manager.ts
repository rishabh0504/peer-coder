import type { LayeredBudget } from "../domain/types.js";
import { DEFAULT_LAYER_BUDGET } from "../domain/types.js";

export interface DensityItem {
  score: number;
  tokenCost: number;
  text: string;
}

export function utility(score: number, tokenCost: number): number {
  return score / Math.max(tokenCost, 1);
}

export function fillByUtility(items: DensityItem[], budgetTokens: number): string[] {
  const ranked = [...items].sort(
    (a, b) => utility(b.score, b.tokenCost) - utility(a.score, a.tokenCost),
  );
  const out: string[] = [];
  let used = 0;
  for (const item of ranked) {
    if (used + item.tokenCost > budgetTokens) continue;
    out.push(item.text);
    used += item.tokenCost;
  }
  return out;
}

export function getDefaultBudget(): LayeredBudget {
  return { ...DEFAULT_LAYER_BUDGET };
}
