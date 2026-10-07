export const UTC_DAY_MS = 86_400_000;

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function endOfUtcDay(value: string): Date {
  return new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
}

export function sevenDayPeriodEnd(start: Date, today: Date): Date {
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const endDay = Math.min(startDay + 6 * UTC_DAY_MS, todayDay);
  return new Date(endDay);
}

export function previousComparablePeriod(start: Date, end: Date): { start: Date; end: Date } {
  const dayStart = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const startDay = dayStart(start);
  const endDay = dayStart(end);
  const lengthDays = Math.max(1, Math.floor((endDay - startDay) / UTC_DAY_MS) + 1);
  const previousEndDay = startDay - UTC_DAY_MS;
  const previousStartDay = previousEndDay - (lengthDays - 1) * UTC_DAY_MS;
  return {
    start: new Date(previousStartDay),
    end: new Date(previousEndDay),
  };
}

export function normalizeBranchScoreWeights(rows: Iterable<{ metricCode: string; weightPercent: number }>): Map<string, number> {
  const weights = new Map<string, number>();
  for (const row of rows) weights.set(row.metricCode, row.weightPercent);
  const canonicalDigital = weights.get("digital_services");
  if (canonicalDigital === undefined) {
    const legacyDigital = weights.get("digital");
    if (legacyDigital !== undefined) weights.set("digital_services", legacyDigital);
  }
  return weights;
}

export const BRANCH_SCORE_CODES = ["commercial", "acquisition", "deposits", "field_activity", "digital_services", "quality", "compliance"] as const;

export function isCompleteBranchScoreWeights(rows: ReadonlyArray<{ metricCode: string; weightPercent: number }>): boolean {
  const codes = rows.map(row => row.metricCode);
  return codes.length === BRANCH_SCORE_CODES.length
    && new Set(codes).size === BRANCH_SCORE_CODES.length
    && BRANCH_SCORE_CODES.every(code => codes.includes(code))
    && rows.reduce((sum, row) => sum + row.weightPercent, 0) === 100;
}
