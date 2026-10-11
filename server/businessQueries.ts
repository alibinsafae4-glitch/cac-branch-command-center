import { and, count, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { branches, branchScoreWeights, complaints, correctiveActions, employees, performance, prospects, qualityFindings, qualityReviews, targets, users, visits } from "../drizzle/schema";
import { getDb } from "./db";
import { branchScope } from "./access";
import { normalizeBranchScoreWeights } from "./domainMath";
import { businessDateKey } from "../shared/date";

export const metricLabels: Record<string, string> = {
  new_customers: "العملاء الجدد", individual_accounts: "حسابات الأفراد", company_accounts: "حسابات الشركات",
  organization_accounts: "حسابات المنظمات", government_accounts: "الحسابات الحكومية", deposits: "الودائع الجديدة",
  financing: "التمويلات", cards: "البطاقات", cac_fast: "CAC Fast", digital_services: "الخدمات الرقمية",
  visits: "الزيارات الميدانية", meetings: "الاجتماعات", calls: "الاتصالات", followups: "المتابعات", transfers: "الحوالات", prospects: "العملاء المحتملون", new_opportunities: "الفرص الجديدة المبلّغ عنها", converted: "العملاء المستقطبون",
};
const dateLabel = (value: Date | string) => value instanceof Date ? businessDateKey(value) : String(value).slice(0, 10);
const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const todayKey = businessDateKey;
const monthStart = () => `${todayKey().slice(0, 7)}-01`;
const parseCount = (value: string | number | null | undefined) => Number(value ?? 0) || 0;
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "قاعدة البيانات غير متاحة حالياً." });
  return db;
};

export async function buildDashboard(user: typeof users.$inferSelect) {
  const db = await dbOrThrow();
  const scope = branchScope(user);
  const today = asDate(todayKey());
  const currentStart = asDate(monthStart());
  const previousMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const previousMonthDays = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).getUTCDate();
  const previousEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, Math.min(today.getUTCDate(), previousMonthDays)));
  const rangeStart = previousMonthStart < currentStart ? previousMonthStart : currentStart;
  const scopedBranch = (column: typeof branches.id | typeof employees.branchId | typeof performance.branchId | typeof targets.branchId | typeof prospects.branchId | typeof visits.branchId | typeof complaints.branchId | typeof qualityFindings.branchId | typeof correctiveActions.branchId | typeof qualityReviews.branchId) =>
    scope === undefined ? undefined : scope < 0 ? sql`1 = 0` : eq(column, scope);
  const [allBranches, perfRows, targetRows, employeeCounts, prospectCounts, visitCounts, complaintCounts, findingCounts, actionCounts, weightRows] = await Promise.all([
    db.select().from(branches).where(scopedBranch(branches.id)),
    db.select().from(performance).where(and(scopedBranch(performance.branchId), gte(performance.periodDate, rangeStart), lte(performance.periodDate, today))).orderBy(desc(performance.periodDate)),
    db.select().from(targets).where(and(scopedBranch(targets.branchId), eq(targets.interval, "شهري"), gte(targets.periodStart, previousMonthStart), lte(targets.periodStart, today))),
    db.select({ branchId: employees.branchId, total: count() }).from(employees).where(and(scopedBranch(employees.branchId), eq(employees.status, "نشط"))).groupBy(employees.branchId),
    db.select({ branchId: prospects.branchId, total: count() }).from(prospects).where(scopedBranch(prospects.branchId)).groupBy(prospects.branchId),
    db.select({ branchId: visits.branchId, total: count() }).from(visits).where(scopedBranch(visits.branchId)).groupBy(visits.branchId),
    db.select({ branchId: complaints.branchId, total: count() }).from(complaints).where(and(scopedBranch(complaints.branchId), or(eq(complaints.status, "مفتوح"), eq(complaints.status, "قيد_التنفيذ")))).groupBy(complaints.branchId),
    db.select({ branchId: qualityFindings.branchId, total: count() }).from(qualityFindings).where(and(scopedBranch(qualityFindings.branchId), or(eq(qualityFindings.status, "مفتوح"), eq(qualityFindings.status, "قيد_التنفيذ")))).groupBy(qualityFindings.branchId),
    db.select({ branchId: correctiveActions.branchId, total: count() }).from(correctiveActions).where(and(scopedBranch(correctiveActions.branchId), ne(correctiveActions.status, "مغلق"))).groupBy(correctiveActions.branchId),
    db.select().from(branchScoreWeights),
  ]);
  const allowedBranches = scope !== undefined && scope < 0 ? [] : allBranches;
  const qualityRows = (await Promise.all(allowedBranches.map(branch => db.select().from(qualityReviews).where(eq(qualityReviews.branchId, branch.id)).orderBy(desc(qualityReviews.reviewDate)).limit(1)))).flat();
  const countByBranch = (rows: Array<{ branchId: number; total: number }>) => new Map(rows.map(row => [row.branchId, Number(row.total)]));
  const employeesByBranch = countByBranch(employeeCounts);
  const prospectsByBranch = countByBranch(prospectCounts);
  const visitsByBranch = countByBranch(visitCounts);
  const complaintsByBranch = countByBranch(complaintCounts);
  const findingsByBranch = countByBranch(findingCounts);
  const actionsByBranch = countByBranch(actionCounts);
  const inRange = (value: Date, start: Date, end: Date) => dateLabel(value) >= dateLabel(start) && dateLabel(value) <= dateLabel(end);
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();
  for (const row of perfRows) {
    const key = `${row.branchId}:${row.metricCode}`;
    if (inRange(row.periodDate, currentStart, today)) currentTotals.set(key, (currentTotals.get(key) ?? 0) + parseCount(row.actualValue));
    if (inRange(row.periodDate, previousMonthStart, previousEnd)) previousTotals.set(key, (previousTotals.get(key) ?? 0) + parseCount(row.actualValue));
  }
  const performanceUpdatedAt = new Map<number, Date>();
  for (const row of perfRows) {
    const previous = performanceUpdatedAt.get(row.branchId);
    if (!previous || row.updatedAt > previous) performanceUpdatedAt.set(row.branchId, row.updatedAt);
  }
  const targetsByBranch = new Map<string, number>();
  const previousTargetsByBranch = new Map<string, number>();
  for (const row of targetRows) {
    const key = `${row.branchId}:${row.metricCode}`;
    if (dateLabel(row.periodStart).slice(0, 7) === todayKey().slice(0, 7)) targetsByBranch.set(key, parseCount(row.targetValue));
    if (dateLabel(row.periodStart).slice(0, 7) === dateLabel(previousMonthStart).slice(0, 7)) previousTargetsByBranch.set(key, parseCount(row.targetValue));
  }
  const latestQuality = new Map<number, typeof qualityRows[number]>();
  for (const row of qualityRows) if (!latestQuality.has(row.branchId)) latestQuality.set(row.branchId, row);
  const weights = normalizeBranchScoreWeights(weightRows);
  const fallbackWeights: Record<string, number> = { commercial: 30, acquisition: 20, deposits: 15, field_activity: 10, digital_services: 10, quality: 10, compliance: 5 };
  const weightTotal = Object.keys(fallbackWeights).reduce((sum, code) => sum + (weights.get(code) ?? fallbackWeights[code]), 0);
  const branchData = allowedBranches.map(branch => {
    const metricValues: Record<string, number> = {};
    const metricGrowth: Record<string, number> = {};
    const metricPrevious: Record<string, number> = {};
    for (const metricCode of Object.keys(metricLabels)) {
      const key = `${branch.id}:${metricCode}`;
      const actual = currentTotals.get(key) ?? 0;
      const previous = previousTotals.get(key) ?? 0;
      metricValues[metricCode] = actual;
      metricPrevious[metricCode] = previous;
      metricGrowth[metricCode] = previous > 0 ? ((actual - previous) / previous) * 100 : 0;
    }
    const progress = (metricCode: string) => {
      const target = targetsByBranch.get(`${branch.id}:${metricCode}`) ?? 0;
      return target > 0 ? Math.min(100, (metricValues[metricCode] ?? 0) / target * 100) : 0;
    };
    const targetValues = Object.fromEntries(Object.keys(metricLabels).map(code => [code, targetsByBranch.get(`${branch.id}:${code}`) ?? 0]));
    const previousTarget = previousTargetsByBranch.get(`${branch.id}:new_customers`) ?? 0;
    const previousAchievement = previousTarget > 0 ? (metricPrevious.new_customers / previousTarget) * 100 : 0;
    const commercial = ["individual_accounts", "company_accounts", "organization_accounts", "government_accounts"].reduce((sum, code) => sum + progress(code), 0) / 4;
    const quality = latestQuality.get(branch.id);
    const qualityScore = quality ? (quality.reception + quality.speed + quality.accuracy + quality.customerExperience) / 4 : 0;
    const complianceScore = quality ? (quality.procedures + quality.forms + quality.kyc + quality.instructions) / 4 : 0;
    const categoryScores: Record<string, number> = {
      commercial,
      acquisition: progress("new_customers"),
      deposits: progress("deposits"),
      field_activity: progress("visits"),
      digital_services: progress("digital_services"),
      quality: qualityScore,
      compliance: complianceScore,
    };
    const weightedScore = Object.entries(fallbackWeights).reduce((sum, [code, defaultWeight]) => sum + categoryScores[code] * (weights.get(code) ?? defaultWeight), 0);
    const score = weightTotal > 0 ? Math.round(weightedScore / weightTotal) : 0;
    const target = targetsByBranch.get(`${branch.id}:new_customers`) ?? 0;
    const achievement = target > 0 ? (metricValues.new_customers / target) * 100 : 0;
    const growth = metricGrowth.new_customers ?? 0;
    const rating = score >= 85 ? "ممتاز" : score >= 70 ? "يحتاج متابعة" : "يحتاج تدخل";
    return {
      ...branch,
      employeesCount: employeesByBranch.get(branch.id) || branch.headcount,
      target,
      actual: metricValues.new_customers ?? 0,
      achievement,
      previousAchievement,
      growth,
      score,
      rating,
      metricValues,
      metricGrowth,
      metricPrevious,
      targetValues,
      performanceUpdatedAt: performanceUpdatedAt.get(branch.id) ?? branch.updatedAt,
      prospectsCount: prospectsByBranch.get(branch.id) ?? 0,
      visitsCount: visitsByBranch.get(branch.id) ?? 0,
      complaintsCount: complaintsByBranch.get(branch.id) ?? 0,
      qualityScore,
      complianceScore,
      openFindingsCount: findingsByBranch.get(branch.id) ?? 0,
      openActionsCount: actionsByBranch.get(branch.id) ?? 0,
    };
  });
  const total = (key: string) => branchData.reduce((sum, branch) => sum + (branch.metricValues[key] ?? 0), 0);
  const targetTotal = branchData.reduce((sum, branch) => sum + branch.target, 0);
  const actualTotal = total("new_customers");
  const achievement = targetTotal ? (actualTotal / targetTotal) * 100 : 0;
  const previousTotal = (codes: string[]) => branchData.reduce((sum, branch) => sum + codes.reduce((branchSum, code) => branchSum + (branch.metricPrevious[code] ?? 0), 0), 0);
  const previousTargetsTotal = branchData.reduce((sum, branch) => sum + (previousTargetsByBranch.get(`${branch.id}:new_customers`) ?? 0), 0);
  const previousAchievement = previousTargetsTotal > 0 ? (previousTotal(["new_customers"]) / previousTargetsTotal) * 100 : 0;
  const achievementGrowth = previousAchievement > 0 ? ((achievement - previousAchievement) / previousAchievement) * 100 : 0;
  const comparisonFor = (codes: string[]) => {
    const current = codes.reduce((sum, code) => sum + total(code), 0);
    const previous = branchData.reduce((sum, branch) => sum + codes.reduce((branchSum, code) => branchSum + (previousTotals.get(`${branch.id}:${code}`) ?? 0), 0), 0);
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };
  return {
    kpis: {
      branches: allowedBranches.filter(branch => branch.status === "نشط").length,
      newCustomers: actualTotal,
      accounts: total("individual_accounts") + total("company_accounts") + total("organization_accounts") + total("government_accounts"),
      deposits: total("deposits"),
      financing: total("financing"),
      cacFast: total("cac_fast"),
      visits: total("visits"),
      achievement,
      growth: comparisonFor(["new_customers"]),
      achievementGrowth,
    },
    comparison: {
      newCustomers: comparisonFor(["new_customers"]),
      accounts: comparisonFor(["individual_accounts", "company_accounts", "organization_accounts", "government_accounts"]),
      deposits: comparisonFor(["deposits"]),
      financing: comparisonFor(["financing"]),
      cacFast: comparisonFor(["cac_fast"]),
      visits: comparisonFor(["visits"]),
      achievement: achievementGrowth,
    },
    previous: {
      newCustomers: previousTotal(["new_customers"]),
      accounts: previousTotal(["individual_accounts", "company_accounts", "organization_accounts", "government_accounts"]),
      deposits: previousTotal(["deposits"]),
      financing: previousTotal(["financing"]),
      cacFast: previousTotal(["cac_fast"]),
      visits: previousTotal(["visits"]),
      achievement: previousAchievement,
    },
    branches: branchData.sort((a, b) => b.score - a.score),
    generatedAt: new Date().toISOString(),
  };
}
