import { and, desc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import {
  aiInsights,
  appSettings,
  auditLogs,
  branchScoreWeights,
  branches,
  complaints,
  correctiveActions,
  dailyReports,
  employees,
  notifications,
  performance,
  prospects,
  qualityFindings,
  qualityReviews,
  reports,
  roles,
  squareAssignments,
  squares,
  targets,
  users,
  visits,
} from "../drizzle/schema";
import { getDb } from "./db";
import { assertBranchRead, assertBranchWrite, branchScope, canReadProspects, canReadQualityDetails, canReadVisits, requireRoles, roleOf } from "./access";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { isCompleteBranchScoreWeights } from "./domainMath";
import { businessDateKey } from "../shared/date";

const dateLabel = (value: Date | string) => value instanceof Date ? businessDateKey(value) : String(value).slice(0, 10);
const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const todayKey = businessDateKey;
const monthStart = () => `${todayKey().slice(0, 7)}-01`;
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "قاعدة البيانات غير متاحة حالياً." });
  return db;
};
const effectiveBranchId = (user: typeof users.$inferSelect, requested?: number) => {
  const scope = branchScope(user);
  if (scope === undefined) return requested;
  if (scope < 0) throw new TRPCError({ code: "FORBIDDEN", message: "لم يتم إسناد فرع إلى حسابك." });
  if (requested && requested !== scope) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى بيانات هذا الفرع." });
  return scope;
};
const audit = async (db: Awaited<ReturnType<typeof dbOrThrow>>, actorUserId: number, action: "create" | "update" | "delete" | "role_change", entity: string, entityId: string | number | undefined, previousValue?: unknown, newValue?: unknown) => {
  await db.insert(auditLogs).values({
    actorUserId,
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    previousValue: previousValue as Record<string, unknown> | undefined,
    newValue: newValue as Record<string, unknown> | undefined,
  });
};
const recordPerformance = async (db: Awaited<ReturnType<typeof dbOrThrow>>, branchId: number, metricCode: string, delta: number, actorId?: number, periodKey = todayKey()) => {
  const day = asDate(periodKey);
  const existing = await db.select().from(performance).where(and(eq(performance.branchId, branchId), eq(performance.metricCode, metricCode), eq(performance.periodDate, day))).limit(1);
  if (existing.length) {
    await db.update(performance).set({ actualValue: sql`${performance.actualValue} + ${delta}`, updatedBy: actorId }).where(eq(performance.id, existing[0].id));
  } else {
    await db.insert(performance).values({ branchId, periodDate: day, metricCode, actualValue: String(delta), previousValue: "0", updatedBy: actorId });
  }
};
const scopedRows = async <T extends { branchId: number }>(user: typeof users.$inferSelect, rows: T[]) => {
  const scope = branchScope(user);
  if (scope === undefined) return rows;
  if (scope < 0) return [];
  return rows.filter(row => row.branchId === scope);
};
const parseCount = (value: string | number | null | undefined) => Number(value ?? 0) || 0;
const syncDailyPerformance = async (db: Awaited<ReturnType<typeof dbOrThrow>>, branchId: number, reportDate: string, previous: Record<string, unknown> | undefined, next: Record<string, unknown>, actorId: number) => {
  const fields = [["individualAccounts", "individual_accounts"], ["companyAccounts", "company_accounts"], ["organizationAccounts", "organization_accounts"], ["governmentAccounts", "government_accounts"], ["cacFast", "cac_fast"], ["cards", "cards"], ["digitalServices", "digital_services"], ["visitsCount", "visits"], ["meetingsCount", "meetings"], ["callsCount", "calls"], ["newCustomers", "new_customers"], ["newOpportunities", "new_opportunities"], ["followups", "followups"]] as const;
  for (const [field, metricCode] of fields) {
    const before = previous?.status === "submitted" ? parseCount(previous[field] as number | string | undefined) : 0;
    const after = next.status === "submitted" ? parseCount(next[field] as number | string | undefined) : 0;
    const delta = after - before;
    if (delta !== 0) await recordPerformance(db, branchId, metricCode, delta, actorId, reportDate);
  }
};


import { operationalRoutes } from "./operationalRouter";
import { buildDashboard } from "./businessQueries";

export const businessRouter = router({
  dashboard: router({
    summary: protectedProcedure.query(({ ctx }) => buildDashboard(ctx.user)),
    trend: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const scope = branchScope(ctx.user);
      const rows = await db.select().from(performance).where(eq(performance.metricCode, "new_customers")).orderBy(performance.periodDate);
      const visible = await scopedRows(ctx.user, rows);
      const byDate = new Map<string, number>();
      for (const row of visible) {
        const key = dateLabel(row.periodDate);
        byDate.set(key, (byDate.get(key) ?? 0) + parseCount(row.actualValue));
      }
      return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([date, value]) => ({ date, label: new Intl.DateTimeFormat("ar-YE", { month: "short", day: "numeric" }).format(new Date(date)), value }));
    }),
    distribution: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const rows = await scopedRows(ctx.user, await db.select().from(prospects));
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(row.customerType, (counts.get(row.customerType) ?? 0) + 1);
      return Array.from(counts, ([name, value]) => ({ name, value }));
    }),
  }),

  ...operationalRoutes,

  intelligence: router({
    latest: protectedProcedure.query(async ({ ctx }) => {
      requireRoles(ctx.user, ["super_admin", "executive", "business_development"]);
      const db = await dbOrThrow();
      const scope = branchScope(ctx.user);
      const rows = await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt)).limit(20);
      return scope === undefined ? rows : rows;
    }),
    analyze: protectedProcedure.mutation(async ({ ctx }) => {
      requireRoles(ctx.user, ["super_admin", "executive", "business_development"]);
      const db = await dbOrThrow();
      const model = await buildDashboard(ctx.user);
      const safeAggregate = model.branches.map(branch => ({ branch: branch.nameAr, branchScore: Math.round(branch.score), achievementPercent: Math.round(branch.achievement * 10) / 10, growthPercent: Math.round(branch.growth * 10) / 10, newCustomers: branch.metricValues.new_customers, deposits: branch.metricValues.deposits, visits: branch.metricValues.visits, complaintsOpen: branch.complaintsCount }));
      const periodLabel = "من بداية الشهر حتى اليوم";
      let content = "";
      let recommendations: string[] = [];
      try {
        const messages = [
          { role: "system" as const, content: "حلّل مؤشرات مصرفية تجريبية مجمّعة فقط ولا تفترض أنها بيانات حقيقية. اعتمد حصراً على JSON الوارد؛ لا تخترع أرقاماً أو أسماء أو أسباباً. أعد JSON مطابقاً للمخطط، بالعربية، واجعل التوقع وصفياً لا وعداً مالياً. الفترات مقارنة من بداية الشهر حتى اليوم بالأيام نفسها من الشهر السابق. اذكر قصور العينة صراحة في dataLimitations، وأعد أربع توصيات تنفيذية محددة فقط." },
          { role: "user" as const, content: JSON.stringify({ period: periodLabel, branches: safeAggregate }) },
        ];
        const responseFormat = {
          type: "json_schema" as const,
          json_schema: {
            name: "branch_business_intelligence",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                executiveSummary: { type: "string" },
                bestPerformingBranches: { type: "array", items: { type: "string" } },
                branchesNeedingAttention: { type: "array", items: { type: "string" } },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } },
                operationalRisks: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                outlook: { type: "string" },
                interventionIndicators: { type: "array", items: { type: "string" } },
                dataLimitations: { type: "string" },
              },
              required: ["executiveSummary", "bestPerformingBranches", "branchesNeedingAttention", "strengths", "weaknesses", "opportunities", "operationalRisks", "recommendations", "outlook", "interventionIndicators", "dataLimitations"],
            },
          },
        };
        const extractText = (result: Awaited<ReturnType<typeof invokeLLM>>) => {
          const raw = result.choices?.[0]?.message?.content;
          return typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(part => part.type === "text" ? part.text : "").join("\n") : "";
        };
        let raw = extractText(await invokeLLM({ model: "gpt-5-mini", messages, response_format: responseFormat }));
        if (!raw.trim()) raw = extractText(await invokeLLM({ model: "gpt-5-mini", messages }));
        if (!raw.trim()) throw new Error("Empty LLM response");
        const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("Invalid structured analysis");
        const parsed: unknown = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid structured analysis");
        const analysis = parsed as Record<string, unknown>;
        const requiredText = (key: string) => {
          const value = analysis[key];
          if (typeof value !== "string" || !value.trim()) throw new Error("Missing analysis section");
          return value.trim();
        };
        const requiredList = (key: string) => {
          const value = analysis[key];
          if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("Invalid analysis list");
          return value.map(item => (item as string).trim()).filter(Boolean);
        };
        const best = requiredList("bestPerformingBranches");
        const attention = requiredList("branchesNeedingAttention");
        const strengths = requiredList("strengths");
        const weaknesses = requiredList("weaknesses");
        const opportunities = requiredList("opportunities");
        const risks = requiredList("operationalRisks");
        recommendations = requiredList("recommendations");
        const interventions = requiredList("interventionIndicators");
        if (recommendations.length !== 4) throw new Error("Expected four recommendations");
        const listText = (items: string[]) => items.length ? items.map(item => `- ${item}`).join("\n") : "لا توجد مؤشرات كافية في الفترة.";
        content = [
          `## ملخص تنفيذي\n${requiredText("executiveSummary")}`,
          `## أفضل الفروع\n${listText(best)}`,
          `## فروع تحتاج متابعة\n${listText(attention)}`,
          `## نقاط القوة\n${listText(strengths)}`,
          `## نقاط الضعف\n${listText(weaknesses)}`,
          `## الفرص\n${listText(opportunities)}`,
          `## المخاطر التشغيلية\n${listText(risks)}`,
          `## التوصيات العملية\n${listText(recommendations)}`,
          `## النظرة للفترة القادمة\n${requiredText("outlook")}`,
          `## مؤشرات تحتاج تدخلاً\n${listText(interventions)}`,
          `## حدود البيانات\n${requiredText("dataLimitations")}`,
        ].join("\n\n");
      } catch (error) {
        console.error("[CBCC AI] Structured analysis failed", error instanceof Error ? error.message : "unknown");
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر إنشاء التحليل الآن؛ تحقق من اتصال خدمة الذكاء الاصطناعي ثم أعد المحاولة." });
      }
      const headline = "قراءة تحليلية مجمعة لأداء الفروع — حتى اليوم";
      const [inserted] = await db.insert(aiInsights).values({ generatedBy: ctx.user.id, periodLabel, headline, content, recommendations, sourceSummary: { period: periodLabel, branchCount: safeAggregate.length, demoData: true, metrics: ["branchScore", "achievementPercent", "growthPercent", "newCustomers", "deposits", "visits", "complaintsOpen"] } });
      const id = Number((inserted as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "ai_insight", id, undefined, { branchCount: safeAggregate.length });
      return { id, headline, content, recommendations, generatedAt: new Date().toISOString(), demoData: true };
    }),
  }),

  search: router({
    global: protectedProcedure.input(z.object({ query: z.string().min(1).max(120) })).query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const q = `%${input.query}%`;
      const scope = branchScope(ctx.user);
      const role = roleOf(ctx.user);
      const [branchRows, employeeRows, prospectRows, squareRows, assignmentRows, visitRows, complaintRows, findingRows, reportRows] = await Promise.all([
        db.select().from(branches).where(or(like(branches.nameAr, q), like(branches.nameEn, q), like(branches.code, q))),
        db.select().from(employees).where(or(like(employees.name, q), like(employees.employeeCode, q), like(employees.title, q))),
        db.select().from(prospects).where(like(prospects.name, q)),
        db.select().from(squares).where(or(like(squares.name, q), like(squares.region, q))),
        db.select().from(squareAssignments),
        db.select().from(visits).where(or(like(visits.agencyName, q), like(visits.personMet, q))),
        db.select().from(complaints).where(or(like(complaints.complaintType, q), like(complaints.details, q))),
        db.select().from(qualityFindings).where(like(qualityFindings.finding, q)),
        db.select().from(reports).where(like(reports.title, q)),
      ]);
      const branchAllowed = (branchId: number) => scope === undefined || branchId === scope;
      const employeeAllowed = (employeeId: number | null | undefined, createdBy: number | null | undefined) => role !== "branch_employee" || (ctx.user.employeeId ? employeeId === ctx.user.employeeId : createdBy === ctx.user.id);
      const canReadQuality = canReadQualityDetails(ctx.user);
      const canReadGlobalReports = ["super_admin", "executive", "business_development", "quality"].includes(role);
      return [
        ...branchRows.filter(item => branchAllowed(item.id)).slice(0, 5).map(item => ({ kind: "فرع", label: item.nameAr, href: `/branches/${item.id}` })),
        ...employeeRows.filter(item => branchAllowed(item.branchId) && (role !== "branch_employee" || item.branchId === scope)).slice(0, 5).map(item => ({ kind: "موظف", label: `${item.name} · ${item.title}`, href: "/branches" })),
        ...(canReadProspects(ctx.user) ? prospectRows.filter(item => branchAllowed(item.branchId) && employeeAllowed(item.employeeId, item.createdBy)).slice(0, 5).map(item => ({ kind: "عميل محتمل", label: item.name, href: "/prospects" })) : []),
        ...squareRows.filter(square => assignmentRows.some(assignment => assignment.squareId === square.id && (scope === undefined || assignment.branchId === scope))).slice(0, 5).map(item => ({ kind: "مربع", label: item.name, href: "/squares" })),
        ...(canReadVisits(ctx.user) ? visitRows.filter(item => branchAllowed(item.branchId) && employeeAllowed(item.employeeId, item.createdBy)).slice(0, 5).map(item => ({ kind: "زيارة", label: item.agencyName, href: "/visits" })) : []),
        ...(canReadQuality ? complaintRows.filter(item => branchAllowed(item.branchId)).slice(0, 5).map(item => ({ kind: "شكوى", label: item.complaintType, href: "/quality" })) : []),
        ...(canReadQuality ? findingRows.filter(item => branchAllowed(item.branchId)).slice(0, 5).map(item => ({ kind: "ملاحظة", label: item.finding.slice(0, 140), href: "/quality" })) : []),
        ...reportRows.filter(item => item.branchId === null ? canReadGlobalReports : branchAllowed(item.branchId)).filter(item => role !== "branch_employee" || item.createdBy === ctx.user.id).slice(0, 5).map(item => ({ kind: "تقرير", label: item.title, href: "/reports" })),
      ].slice(0, 24);
    }),
  }),
  settings: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireRoles(ctx.user, ["super_admin"]);
      const db = await dbOrThrow();
      const [weightRows, userRows, roleRows, auditRows, branchRows] = await Promise.all([
        db.select().from(branchScoreWeights), db.select().from(users).orderBy(desc(users.createdAt)).limit(200),
        db.select().from(roles), db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(40), db.select().from(branches),
      ]);
      const normalizedWeights = new Map<string, typeof weightRows[number]>();
      for (const row of weightRows) {
        const metricCode = row.metricCode === "digital" ? "digital_services" : row.metricCode;
        const previous = normalizedWeights.get(metricCode);
        if (!previous || row.updatedAt > previous.updatedAt) normalizedWeights.set(metricCode, { ...row, metricCode });
      }
      return { weights: [...normalizedWeights.values()], users: userRows.map(({ openId: _openId, ...rest }) => rest), roles: roleRows, auditLogs: auditRows, branches: branchRows };
    }),
    updateWeights: protectedProcedure.input(z.object({ weights: z.array(z.object({ metricCode: z.string().min(2).max(64), metricName: z.string().min(2).max(120), weightPercent: z.number().int().min(0).max(100) })).length(7) })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      if (!isCompleteBranchScoreWeights(input.weights)) throw new TRPCError({ code: "BAD_REQUEST", message: "أدخل فئات Branch Score السبع الفريدة المعتمدة، على أن يساوي مجموع أوزانها 100%." });
      const db = await dbOrThrow();
      for (const row of input.weights) await db.insert(branchScoreWeights).values({ ...row, updatedBy: ctx.user.id }).onDuplicateKeyUpdate({ set: { metricName: row.metricName, weightPercent: row.weightPercent, updatedBy: ctx.user.id } });
      await audit(db, ctx.user.id, "update", "branch_score_weights", undefined, undefined, input.weights as unknown);
      return { success: true };
    }),
    updateUser: protectedProcedure.input(z.object({ userId: z.number().int().positive(), appRole: z.enum(["super_admin", "executive", "business_development", "quality", "branch_manager", "branch_employee"]), assignedBranchId: z.number().int().positive().nullable(), employeeId: z.number().int().positive().nullable(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      if (input.userId === ctx.user.id && (input.appRole !== "super_admin" || !input.isActive)) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن سحب صلاحية مدير النظام من الجلسة الحالية." });
      const db = await dbOrThrow();
      if (["branch_manager", "branch_employee"].includes(input.appRole) && !input.assignedBranchId) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب إسناد مستخدم الفرع إلى فرع محدد." });
      if (input.assignedBranchId) {
        const [branch] = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, input.assignedBranchId)).limit(1);
        if (!branch) throw new TRPCError({ code: "BAD_REQUEST", message: "الفرع المحدد غير موجود." });
      }
      if (input.employeeId) {
        const [employee] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        if (!employee || employee.branchId !== input.assignedBranchId || employee.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "اختر موظفاً نشطاً تابعاً للفرع المحدد." });
      }
      const [previous] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!previous) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود." });
      await db.update(users).set({ appRole: input.appRole, assignedBranchId: input.assignedBranchId, employeeId: input.employeeId, isActive: input.isActive ? 1 : 0 }).where(eq(users.id, input.userId));
      await audit(db, ctx.user.id, "role_change", "user", input.userId, { appRole: previous.appRole, assignedBranchId: previous.assignedBranchId, isActive: previous.isActive }, input);
      return { success: true };
    }),
  }),
});
