export const PLAN_LIMITS = {
  starter:     { brands: 1, lpsPerBrand: 1 },
  growth:      { brands: 2, lpsPerBrand: 1 },
  agency:      { brands: 999, lpsPerBrand: 1 },
  super_admin: { brands: 999, lpsPerBrand: 999 },
} as const;

export function getPlanLimits(planTier: string) {
  return PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.starter;
}
