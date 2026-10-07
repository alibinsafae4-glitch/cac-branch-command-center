import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  auditLogs, branches, branchScoreWeights, complaints, correctiveActions, dailyReports,
  employees, notifications, performance, prospects, qualityFindings, qualityReviews,
  reports, squareAssignments, squares, targets, users, visits,
} from "../drizzle/schema";
import { getDb } from "./db";
import { assertBranchRead, assertBranchWrite, branchScope, canReadProspects, prospectReadRoles, qualityReadRoles, requireRoles, roleOf, visitReadRoles } from "./access";
import { protectedProcedure, router } from "./_core/trpc";
import { buildDashboard, metricLabels } from "./businessQueries";
import { ENV } from "./_core/env";
import { endOfUtcDay, isValidISODate, previousComparablePeriod, sevenDayPeriodEnd } from "./domainMath";
import { isAllowedAttachmentContent, signAttachmentScope, verifyAttachmentScope } from "./attachmentProof";
import { businessDateKey, businessDayEndUtc, businessDayStartUtc } from "../shared/date";

const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const dateLabel = (value: Date | string) => value instanceof Date ? businessDateKey(value) : String(value).slice(0, 10);
const todayKey = businessDateKey;
const parseCount = (value: string | number | null | undefined) => Number(value ?? 0) || 0;
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "قاعدة البيانات غير متاحة حالياً." });
  return db;
};
const audit = async (db: Awaited<ReturnType<typeof dbOrThrow>>, actorUserId: number, action: "create" | "update" | "delete" | "role_change", entity: string, entityId: string | number | undefined, previousValue?: unknown, newValue?: unknown) => {
  await db.insert(auditLogs).values({ actorUserId, action, entity, entityId: entityId == null ? null : String(entityId), previousValue: previousValue as Record<string, unknown> | undefined, newValue: newValue as Record<string, unknown> | undefined });
};
const effectiveBranchId = (user: typeof users.$inferSelect, requested?: number) => {
  const scope = branchScope(user);
  if (scope === undefined) return requested;
  if (scope < 0) throw new TRPCError({ code: "FORBIDDEN", message: "لم يتم إسناد فرع إلى حسابك." });
  if (requested && requested !== scope) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى بيانات هذا الفرع." });
  return scope;
};
const scoped = <T extends { branchId: number }>(user: typeof users.$inferSelect, rows: T[]) => {
  const scope = branchScope(user);
  return scope === undefined ? rows : scope < 0 ? [] : rows.filter(item => item.branchId === scope);
};
const recordPerformance = async (db: Awaited<ReturnType<typeof dbOrThrow>>, branchId: number, metricCode: string, delta: number, actorId?: number, periodKey = todayKey()) => {
  if (delta === 0) return;
  const day = asDate(periodKey);
  const [existing] = await db.select().from(performance).where(and(eq(performance.branchId, branchId), eq(performance.metricCode, metricCode), eq(performance.periodDate, day))).limit(1);
  if (existing) {
    await db.update(performance).set({ actualValue: sql`${performance.actualValue} + ${delta}`, updatedBy: actorId }).where(eq(performance.id, existing.id));
  } else {
    await db.insert(performance).values({ branchId, periodDate: day, metricCode, actualValue: String(delta), previousValue: "0", updatedBy: actorId });
  }
};

const prospectStatus = z.enum(["new", "contacted", "visited", "following_up", "negotiation", "converted", "not_interested", "deferred"]);
const dateInput = z.string().refine(isValidISODate, "أدخل تاريخاً تقويمياً صحيحاً بصيغة YYYY-MM-DD.");
const monthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(value => isValidISODate(`${value}-01`), "اختر شهراً تقويمياً صحيحاً.");
const visitAttachmentSchema = z.object({
  name: z.string().max(180),
  url: z.string().regex(/^cbcc\/visit-attachments\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,8}$/),
  size: z.number().int().min(1).max(8 * 1024 * 1024),
  proof: z.string().regex(/^[a-f0-9]{64}$/i),
  issuedAt: z.number().int().positive(),
});

async function assertBranchExists(db: Awaited<ReturnType<typeof dbOrThrow>>, branchId: number) {
  const [branch] = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "الفرع المحدد غير موجود." });
  return branch;
}

export const operationalRoutes = {
  branches: router({
    list: protectedProcedure.query(async ({ ctx }) => (await buildDashboard(ctx.user)).branches),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      assertBranchRead(ctx.user, input.id);
      const model = await buildDashboard(ctx.user);
      const branch = model.branches.find(item => item.id === input.id);
      if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "الفرع غير موجود أو خارج نطاق صلاحيتك." });
      return branch;
    }),
    save: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/), nameAr: z.string().trim().min(2).max(160), nameEn: z.string().trim().min(2).max(160), managerName: z.string().max(160).optional(), branchType: z.enum(["branch", "suboffice", "islamic"]), parentBranchCode: z.string().max(32).optional(), headcount: z.number().int().min(0).max(5000) })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      const db = await dbOrThrow();
      if (input.branchType === "suboffice" && !input.parentBranchCode) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ربط المكتب التابع بفرع رئيسي." });
      if (input.parentBranchCode) {
        const [parent] = await db.select().from(branches).where(eq(branches.code, input.parentBranchCode.toUpperCase())).limit(1);
        if (!parent || parent.branchType === "suboffice") throw new TRPCError({ code: "BAD_REQUEST", message: "اختر فرعاً رئيسياً صالحاً للمكتب التابع." });
      }
      const payload = { ...input, code: input.code.toUpperCase(), managerName: input.managerName || null, parentBranchCode: input.parentBranchCode || null };
      const [result] = await db.insert(branches).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "branch", id, undefined, payload);
      return { id };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/).optional(), nameAr: z.string().trim().min(2).max(160).optional(), nameEn: z.string().trim().min(2).max(160).optional(), managerName: z.string().max(160).optional(), branchType: z.enum(["branch", "suboffice", "islamic"]).optional(), parentBranchCode: z.string().max(32).optional(), headcount: z.number().int().min(0).max(5000).optional(), status: z.enum(["active", "inactive"]).optional() })).mutation(async ({ ctx, input }) => {
      const role = roleOf(ctx.user);
      if (!["super_admin", "branch_manager"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعديل بيانات الفروع." });
      if (role === "branch_manager" && branchScope(ctx.user) !== input.id) throw new TRPCError({ code: "FORBIDDEN", message: "يمكنك تعديل بيانات فرعك فقط." });
      if (role === "branch_manager" && [input.code, input.nameAr, input.nameEn, input.branchType, input.parentBranchCode, input.status].some(value => value !== undefined)) throw new TRPCError({ code: "FORBIDDEN", message: "يمكن لمدير الفرع تعديل اسم المسؤول وعدد الموظفين فقط." });
      const db = await dbOrThrow();
      const [branch] = await db.select().from(branches).where(eq(branches.id, input.id)).limit(1);
      if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "الفرع غير موجود." });
      if (input.branchType === "suboffice" && !(input.parentBranchCode ?? branch.parentBranchCode)) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ربط المكتب التابع بفرع رئيسي." });
      if (input.parentBranchCode) {
        const [parent] = await db.select().from(branches).where(eq(branches.code, input.parentBranchCode.toUpperCase())).limit(1);
        if (!parent || parent.id === input.id || parent.branchType === "suboffice") throw new TRPCError({ code: "BAD_REQUEST", message: "اختر فرعاً رئيسياً صالحاً للمكتب التابع." });
      }
      const payload = {
        ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
        ...(input.managerName !== undefined ? { managerName: input.managerName || null } : {}),
        ...(input.branchType !== undefined ? { branchType: input.branchType } : {}),
        ...(input.parentBranchCode !== undefined ? { parentBranchCode: input.parentBranchCode || null } : {}),
        ...(input.headcount !== undefined ? { headcount: input.headcount } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      if (!Object.keys(payload).length) throw new TRPCError({ code: "BAD_REQUEST", message: "لم تُرسل بيانات لتحديثها." });
      await db.update(branches).set(payload).where(eq(branches.id, input.id));
      await audit(db, ctx.user.id, "update", "branch", input.id, { code: branch.code, nameAr: branch.nameAr, managerName: branch.managerName, headcount: branch.headcount, status: branch.status }, payload);
      return { success: true };
    }),
  }),

  squares: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const [squareRows, assignmentRows, branchRows, prospectRows, visitRows, employeeRows] = await Promise.all([
        db.select().from(squares).orderBy(squares.squareNumber), db.select().from(squareAssignments), db.select().from(branches), db.select().from(prospects), db.select().from(visits), db.select().from(employees),
      ]);
      const allowedAssignments = assignmentRows.filter(item => branchScope(ctx.user) === undefined || item.branchId === branchScope(ctx.user));
      const visible = branchScope(ctx.user) === undefined ? squareRows : squareRows.filter(square => allowedAssignments.some(item => item.squareId === square.id));
      return visible.map(square => {
        const assignments = allowedAssignments.filter(item => item.squareId === square.id).map(item => ({ ...item, branch: branchRows.find(branch => branch.id === item.branchId)?.nameAr ?? "فرع", branchType: branchRows.find(branch => branch.id === item.branchId)?.branchType, employee: employeeRows.find(employee => employee.id === item.employeeId)?.name ?? null }));
        const prospectsCount = prospectRows.filter(item => item.squareId === square.id && (branchScope(ctx.user) === undefined || item.branchId === branchScope(ctx.user))).length;
        const visitsCount = visitRows.filter(item => item.squareId === square.id && (branchScope(ctx.user) === undefined || item.branchId === branchScope(ctx.user))).length;
        const converted = prospectRows.filter(item => item.squareId === square.id && item.status === "converted" && (branchScope(ctx.user) === undefined || item.branchId === branchScope(ctx.user))).length;
        return { ...square, assignments, prospectsCount, visitsCount, achievement: square.targetValue > 0 ? Math.round(converted / square.targetValue * 1000) / 10 : 0 };
      });
    }),
    create: protectedProcedure.input(z.object({ squareNumber: z.number().int().positive().max(999), name: z.string().trim().min(2).max(120), region: z.string().trim().min(2).max(120), centerLatitude: z.number().min(-90).max(90), centerLongitude: z.number().min(-180).max(180), halfSize: z.number().min(0.001).max(0.05), branchId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      const db = await dbOrThrow();
      const branchRows = await db.select().from(branches);
      const primaryBranch = input.branchId ? branchRows.find(branch => branch.id === input.branchId) : undefined;
      if (input.branchId && (!primaryBranch || primaryBranch.branchType === "islamic")) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر فرعاً أساسياً صالحاً؛ يمكن إسناد كاك الإسلامي تلقائياً." });
      if (input.centerLatitude - input.halfSize < -90 || input.centerLatitude + input.halfSize > 90 || input.centerLongitude - input.halfSize < -180 || input.centerLongitude + input.halfSize > 180) throw new TRPCError({ code: "BAD_REQUEST", message: "المضلع يتجاوز الحدود الجغرافية الصحيحة." });
      const polygon: Array<[number, number]> = [[input.centerLatitude - input.halfSize, input.centerLongitude - input.halfSize], [input.centerLatitude - input.halfSize, input.centerLongitude + input.halfSize], [input.centerLatitude + input.halfSize, input.centerLongitude + input.halfSize], [input.centerLatitude + input.halfSize, input.centerLongitude - input.halfSize]];
      const [result] = await db.insert(squares).values({ squareNumber: input.squareNumber, name: input.name, region: input.region, polygon, entitiesCount: 0, companiesCount: 0, organizationsCount: 0, merchantsCount: 0, targetValue: 0 });
      const id = Number((result as { insertId?: number }).insertId);
      const islamicBranches = branchRows.filter(branch => branch.branchType === "islamic");
      if (islamicBranches.length) await db.insert(squareAssignments).values(islamicBranches.map(branch => ({ squareId: id, branchId: branch.id, isPrimary: false })));
      if (primaryBranch) await db.insert(squareAssignments).values({ squareId: id, branchId: primaryBranch.id, isPrimary: true });
      await audit(db, ctx.user.id, "create", "square", id, undefined, { squareNumber: input.squareNumber, name: input.name, region: input.region, branchId: input.branchId ?? null });
      return { id };
    }),
    saveAssignment: protectedProcedure.input(z.object({ squareId: z.number().int().positive(), branchId: z.number().int().positive(), employeeId: z.number().int().positive().optional().nullable(), isPrimary: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      const db = await dbOrThrow();
      const [square] = await db.select().from(squares).where(eq(squares.id, input.squareId)).limit(1);
      const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!square || !branch) throw new TRPCError({ code: "NOT_FOUND", message: "المربع أو الفرع غير موجود." });
      if (input.employeeId) {
        const [employee] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        if (!employee || employee.branchId !== input.branchId || employee.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "اختر موظفاً نشطاً تابعاً للفرع المحدد." });
      }
      if (branch.branchType !== "islamic") await db.delete(squareAssignments).where(and(eq(squareAssignments.squareId, input.squareId), eq(squareAssignments.isPrimary, true)));
      const isPrimary = branch.branchType === "islamic" ? false : input.isPrimary;
      await db.insert(squareAssignments).values({ squareId: input.squareId, branchId: input.branchId, employeeId: input.employeeId ?? null, isPrimary }).onDuplicateKeyUpdate({ set: { employeeId: input.employeeId ?? null, isPrimary } });
      await audit(db, ctx.user.id, "update", "square_assignment", `${input.squareId}:${input.branchId}`, undefined, { branchId: input.branchId, employeeId: input.employeeId ?? null, isPrimary });
      return { success: true };
    }),
  }),

  employees: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const scope = branchScope(ctx.user);
      const rows = await (await dbOrThrow()).select().from(employees);
      return rows.filter(employee => employee.status === "active" && (scope === undefined || employee.branchId === scope)).map(({ id, branchId, employeeCode, name, title }) => ({ id, branchId, employeeCode, name, title }));
    }),
  }),

  prospects: router({
    list: protectedProcedure.input(z.object({ search: z.string().max(120).optional(), status: prospectStatus.optional() }).optional()).query(async ({ ctx, input }) => {
      requireRoles(ctx.user, prospectReadRoles);
      const db = await dbOrThrow();
      let rows = scoped(ctx.user, await db.select().from(prospects).orderBy(desc(prospects.updatedAt)));
      if (roleOf(ctx.user) === "branch_employee") rows = rows.filter(item => ctx.user.employeeId ? item.employeeId === ctx.user.employeeId : item.createdBy === ctx.user.id);
      if (input?.status) rows = rows.filter(item => item.status === input.status);
      if (input?.search) {
        const needle = input.search.toLowerCase();
        rows = rows.filter(item => `${item.name} ${item.customerType} ${item.sector} ${item.activity ?? ""}`.toLowerCase().includes(needle));
      }
      return rows;
    }),
    save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(180), customerType: z.string().trim().min(2).max(80), sector: z.string().trim().min(2).max(120), activity: z.string().max(160).optional(), phone: z.string().max(48).optional(), email: z.string().max(320).optional(), address: z.string().max(3000).optional(), squareId: z.number().int().positive().nullable().optional(), branchId: z.number().int().positive(), employeeId: z.number().int().positive().nullable().optional(), firstContactDate: dateInput.optional().or(z.literal("")), lastFollowupAt: dateInput.optional().or(z.literal("")), nextFollowupAt: dateInput.optional().or(z.literal("")), products: z.string().max(1000).optional(), expectedValue: z.number().min(0).max(1_000_000_000_000), status: prospectStatus, notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "prospect");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const { id, firstContactDate, lastFollowupAt, nextFollowupAt, ...rest } = input;
      const employeeId = roleOf(ctx.user) === "branch_employee" ? (ctx.user.employeeId ?? null) : (rest.employeeId ?? null);
      if (roleOf(ctx.user) === "branch_employee" && input.employeeId !== employeeId) throw new TRPCError({ code: "FORBIDDEN", message: "يمكنك إسناد العميل إلى حسابك فقط." });
      if (employeeId) {
        const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
        if (!employee || employee.branchId !== input.branchId || employee.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "الموظف المحدد غير نشط أو لا يتبع الفرع." });
      }
      if (input.squareId) {
        const [square] = await db.select({ id: squares.id }).from(squares).where(eq(squares.id, input.squareId)).limit(1);
        if (!square) throw new TRPCError({ code: "BAD_REQUEST", message: "المربع الجغرافي المحدد غير موجود." });
        const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
        const assignmentRows = await db.select().from(squareAssignments).where(eq(squareAssignments.squareId, input.squareId));
        if (!assignmentRows.some(item => item.branchId === input.branchId) && branch?.branchType !== "islamic") throw new TRPCError({ code: "BAD_REQUEST", message: "المربع غير مسند إلى الفرع المحدد." });
      }
      const payload = { ...rest, employeeId, firstContactDate: firstContactDate ? asDate(firstContactDate) : null, lastFollowupAt: lastFollowupAt ? asDate(lastFollowupAt) : null, nextFollowupAt: nextFollowupAt ? asDate(nextFollowupAt) : null, expectedValue: String(input.expectedValue) };
      let idValue = id;
      let previous: typeof prospects.$inferSelect | undefined;
      if (id) {
        const [row] = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
        previous = row;
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "العميل المحتمل غير موجود." });
        assertBranchWrite(ctx.user, row.branchId, "prospect");
        if (row.branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل سجل العميل المحتمل إلى فرع آخر من نموذج التعديل." });
        if (roleOf(ctx.user) === "branch_employee" && !(ctx.user.employeeId ? row.employeeId === ctx.user.employeeId : row.createdBy === ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تعديل سجل غير مسند إليك." });
        await db.update(prospects).set(payload).where(eq(prospects.id, id));
      } else {
        const [result] = await db.insert(prospects).values({ ...payload, createdBy: ctx.user.id });
        idValue = Number((result as { insertId?: number }).insertId);
        await recordPerformance(db, input.branchId, "prospects", 1, ctx.user.id);
      }
      const wasConverted = previous?.status === "converted";
      const isConverted = input.status === "converted";
      if (wasConverted !== isConverted) {
        const delta = isConverted ? 1 : -1;
        await recordPerformance(db, input.branchId, "converted", delta, ctx.user.id);
        await recordPerformance(db, input.branchId, "new_customers", delta, ctx.user.id);
      }
      const cleanAudit = { status: input.status, sector: input.sector, branchId: input.branchId, squareId: input.squareId ?? null, employeeId, expectedValue: input.expectedValue };
      await audit(db, ctx.user.id, id ? "update" : "create", "prospect", idValue, previous ? { status: previous.status, sector: previous.sector, branchId: previous.branchId, squareId: previous.squareId } : undefined, cleanAudit);
      return { id: idValue };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin", "business_development", "branch_manager"]);
      const db = await dbOrThrow();
      const [row] = await db.select().from(prospects).where(eq(prospects.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "العميل المحتمل غير موجود." });
      assertBranchWrite(ctx.user, row.branchId, "prospect");
      await db.delete(prospects).where(eq(prospects.id, input.id));
      await recordPerformance(db, row.branchId, "prospects", -1, ctx.user.id, dateLabel(row.createdAt));
      if (row.status === "converted") {
        await recordPerformance(db, row.branchId, "converted", -1, ctx.user.id);
        await recordPerformance(db, row.branchId, "new_customers", -1, ctx.user.id);
      }
      await audit(db, ctx.user.id, "delete", "prospect", row.id, { status: row.status, branchId: row.branchId }, undefined);
      return { success: true };
    }),
  }),

  visits: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireRoles(ctx.user, visitReadRoles);
      let rows = scoped(ctx.user, await (await dbOrThrow()).select().from(visits).orderBy(desc(visits.visitAt)));
      if (roleOf(ctx.user) === "branch_employee") rows = rows.filter(item => ctx.user.employeeId ? item.employeeId === ctx.user.employeeId : item.createdBy === ctx.user.id);
      return rows.map(item => ({ ...item, attachments: (item.attachments ?? []).map(file => ({ name: file.name, size: file.size, url: "" })) }));
    }),
    upload: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), fileName: z.string().min(1).max(180), contentType: z.string().refine(value => ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(value), "نوع الملف غير مدعوم."), dataBase64: z.string().min(1).max(11_200_000) })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "visit");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      if (!ENV.cookieSecret) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر إنشاء توقيع آمن للمرفق." });
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "خدمة التخزين الدائم غير مهيأة لهذا المشروع." });
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.dataBase64)) throw new TRPCError({ code: "BAD_REQUEST", message: "ترميز الملف غير صالح." });
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "يجب ألا يتجاوز كل مرفق 8 ميغابايت." });
      const name = (input.fileName.split(/[\\/]/).pop() ?? "").trim();
      if (!name || name === "." || name === ".." || !isAllowedAttachmentContent(input.contentType, name, bytes)) throw new TRPCError({ code: "BAD_REQUEST", message: "امتداد المرفق أو محتواه لا يطابق نوع ملف مسموحاً." });
      const suffix = name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) ?? "bin";
      const key = `cbcc/visit-attachments/${nanoid()}.${suffix}`;
      const base = ENV.forgeApiUrl.replace(/\/+$/, "");
      const presign = await fetch(`${base}/v1/storage/presign/put?path=${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!presign.ok) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر تجهيز رفع المرفق." });
      const payload = await presign.json() as { url?: string; error?: string };
      if (!payload.url) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر تجهيز رابط التخزين." });
      const uploaded = await fetch(payload.url, { method: "PUT", headers: { "Content-Type": input.contentType }, body: bytes });
      if (!uploaded.ok) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "فشل رفع المرفق إلى التخزين الدائم." });
      const issuedAt = Date.now();
      const proof = signAttachmentScope(ENV.cookieSecret, { userId: ctx.user.id, branchId: input.branchId, key, name, size: bytes.length, issuedAt });
      return { name, url: key, size: bytes.length, proof, issuedAt };
    }),
    downloadAttachment: protectedProcedure.input(z.object({ visitId: z.number().int().positive(), index: z.number().int().min(0).max(4) })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, visitReadRoles);
      const db = await dbOrThrow();
      const [row] = await db.select().from(visits).where(eq(visits.id, input.visitId)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الزيارة أو المرفق غير موجود." });
      assertBranchRead(ctx.user, row.branchId);
      if (roleOf(ctx.user) === "branch_employee" && !(ctx.user.employeeId ? row.employeeId === ctx.user.employeeId : row.createdBy === ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تنزيل مرفق زيارة غير مسندة إليك." });
      const file = row.attachments?.[input.index];
      if (!file || !/^cbcc\/visit-attachments\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,8}$/.test(file.url)) throw new TRPCError({ code: "NOT_FOUND", message: "المرفق غير متاح." });
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "خدمة التخزين الدائم غير مهيأة لهذا المشروع." });
      const base = ENV.forgeApiUrl.replace(/\/+$/, "");
      const response = await fetch(`${base}/v1/storage/presign/get?path=${encodeURIComponent(file.url)}`, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!response.ok) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر تجهيز رابط تنزيل المرفق." });
      const result = await response.json() as { url?: string };
      if (!result.url) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر تجهيز رابط تنزيل المرفق." });
      return { url: result.url };
    }),
    create: protectedProcedure.input(z.object({ agencyName: z.string().trim().min(2).max(180), agencyType: z.string().min(2).max(100), prospectId: z.number().int().positive().nullable().optional(), squareId: z.number().int().positive().nullable().optional(), branchId: z.number().int().positive(), employeeId: z.number().int().positive().nullable().optional(), visitAt: z.string().datetime(), location: z.string().max(240).optional(), visitType: z.string().min(2).max(100), personMet: z.string().max(160).optional(), result: z.string().max(4000).optional(), products: z.string().max(1000).optional(), opportunities: z.string().max(2000).optional(), notes: z.string().max(4000).optional(), nextAction: z.string().max(2000).optional(), nextFollowupAt: dateInput.optional().or(z.literal("")), attachments: z.array(visitAttachmentSchema).max(5).optional() })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "visit");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const proofNow = Date.now();
      for (const file of input.attachments ?? []) {
        if (file.issuedAt > proofNow + 60_000 || proofNow - file.issuedAt > 30 * 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية المرفق؛ أعد رفعه قبل حفظ الزيارة." });
        const scope = { userId: ctx.user.id, branchId: input.branchId, key: file.url, name: file.name, size: file.size, issuedAt: file.issuedAt };
        if (!ENV.cookieSecret || !verifyAttachmentScope(ENV.cookieSecret, scope, file.proof)) throw new TRPCError({ code: "FORBIDDEN", message: "المرفق غير مرتبط بحسابك أو بالفرع المحدد." });
      }
      if (roleOf(ctx.user) === "branch_employee" && input.employeeId !== (ctx.user.employeeId ?? null)) throw new TRPCError({ code: "FORBIDDEN", message: "يمكنك تسجيل زيارة باسمك فقط." });
      const selectedEmployee = roleOf(ctx.user) === "branch_employee" ? ctx.user.employeeId : input.employeeId;
      if (selectedEmployee) {
        const [employee] = await db.select().from(employees).where(eq(employees.id, selectedEmployee)).limit(1);
        if (!employee || employee.branchId !== input.branchId || employee.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "الموظف المحدد غير نشط أو لا يتبع الفرع." });
      }
      if (input.prospectId) {
        const [prospect] = await db.select().from(prospects).where(eq(prospects.id, input.prospectId)).limit(1);
        if (!prospect || prospect.branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "العميل المحتمل غير مرتبط بالفرع المحدد." });
        if (roleOf(ctx.user) === "branch_employee" && !(ctx.user.employeeId ? prospect.employeeId === ctx.user.employeeId : prospect.createdBy === ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "العميل المحتمل غير مسند إليك." });
      }
      if (input.squareId) {
        const [square] = await db.select({ id: squares.id }).from(squares).where(eq(squares.id, input.squareId)).limit(1);
        if (!square) throw new TRPCError({ code: "BAD_REQUEST", message: "المربع الجغرافي المحدد غير موجود." });
        const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
        const assignmentRows = await db.select().from(squareAssignments).where(eq(squareAssignments.squareId, input.squareId));
        if (!assignmentRows.some(item => item.branchId === input.branchId) && branch?.branchType !== "islamic") throw new TRPCError({ code: "BAD_REQUEST", message: "المربع غير مسند إلى الفرع المحدد." });
      }
      const { visitAt, nextFollowupAt, attachments: submittedAttachments, ...rest } = input;
      const attachments = (submittedAttachments ?? []).map(({ name, url, size }) => ({ name, url, size }));
      const payload = { ...rest, visitAt: new Date(visitAt), nextFollowupAt: nextFollowupAt ? asDate(nextFollowupAt) : null, employeeId: roleOf(ctx.user) === "branch_employee" ? (ctx.user.employeeId ?? null) : (input.employeeId ?? null), attachments, createdBy: ctx.user.id };
      const [result] = await db.insert(visits).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await recordPerformance(db, input.branchId, "visits", 1, ctx.user.id);
      if (input.visitType.includes("اجتماع")) await recordPerformance(db, input.branchId, "meetings", 1, ctx.user.id);
      await audit(db, ctx.user.id, "create", "visit", id, undefined, { branchId: input.branchId, agencyType: input.agencyType, visitType: input.visitType, squareId: input.squareId ?? null, attachmentCount: input.attachments?.length ?? 0 });
      return { id };
    }),
  }),

  targets: router({
    list: protectedProcedure.input(z.object({ branchId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin", "executive", "business_development", "quality", "branch_manager"]);
      const db = await dbOrThrow();
      const scope = effectiveBranchId(ctx.user, input?.branchId);
      const [allTargets, perfRows] = await Promise.all([db.select().from(targets).orderBy(desc(targets.periodStart)), db.select().from(performance)]);
      const rows = scope === undefined ? allTargets : allTargets.filter(item => item.branchId === scope);
      return rows.map(item => {
        const start = new Date(dateLabel(item.periodStart) + "T00:00:00.000Z");
        const end = new Date(start);
        if (item.interval === "daily") end.setUTCDate(end.getUTCDate());
        if (item.interval === "weekly") end.setUTCDate(end.getUTCDate() + 6);
        if (item.interval === "monthly") { end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); }
        if (item.interval === "quarterly") { end.setUTCMonth(end.getUTCMonth() + 3); end.setUTCDate(0); }
        if (item.interval === "yearly") { end.setUTCFullYear(end.getUTCFullYear() + 1); end.setUTCDate(0); }
        const actual = perfRows.filter(row => row.branchId === item.branchId && row.metricCode === item.metricCode && row.periodDate >= start && row.periodDate <= end).reduce((sum, row) => sum + parseCount(row.actualValue), 0);
        const targetValue = parseCount(item.targetValue);
        return { ...item, actual, achievement: targetValue > 0 ? actual / targetValue * 100 : 0, periodEnd: end };
      });
    }),
    save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), branchId: z.number().int().positive(), metricCode: z.string().min(2).max(64), metricName: z.string().min(2).max(120), interval: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]), periodStart: dateInput, targetValue: z.number().positive().max(1_000_000_000_000) })).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin"]);
      const db = await dbOrThrow();
      const canonicalMetricName = metricLabels[input.metricCode];
      if (!canonicalMetricName) throw new TRPCError({ code: "BAD_REQUEST", message: "المؤشر المحدد غير موجود في كتالوج المؤشرات." });
      await assertBranchExists(db, input.branchId);
      const { id, periodStart, ...rest } = input;
      const payload = { ...rest, metricName: canonicalMetricName, periodStart: asDate(periodStart), targetValue: String(input.targetValue), createdBy: ctx.user.id };
      let targetId = id;
      let previous: typeof targets.$inferSelect | undefined;
      if (id) {
        const [row] = await db.select().from(targets).where(eq(targets.id, id)).limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "المستهدف غير موجود." });
        previous = row;
        await db.update(targets).set(payload).where(eq(targets.id, id));
      } else {
        const [existing] = await db.select().from(targets).where(and(eq(targets.branchId, input.branchId), eq(targets.metricCode, input.metricCode), eq(targets.interval, input.interval), eq(targets.periodStart, asDate(periodStart)))).limit(1);
        if (existing) {
          previous = existing;
          targetId = existing.id;
          await db.update(targets).set(payload).where(eq(targets.id, existing.id));
        } else {
          const [result] = await db.insert(targets).values(payload);
          targetId = Number((result as { insertId?: number }).insertId);
        }
      }
      await audit(db, ctx.user.id, previous ? "update" : "create", "target", targetId, previous, { ...rest, metricName: canonicalMetricName, periodStart, targetValue: input.targetValue });
      return { id: targetId };
    }),
  }),

  dailyReports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      let rows = await (await dbOrThrow()).select().from(dailyReports).orderBy(desc(dailyReports.reportDate));
      rows = scoped(ctx.user, rows);
      if (roleOf(ctx.user) === "branch_employee") rows = rows.filter(item => item.userId === ctx.user.id);
      return rows;
    }),
    save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), branchId: z.number().int().positive(), reportDate: dateInput, status: z.enum(["draft", "submitted"]), individualAccounts: z.number().int().min(0).max(1_000_000), companyAccounts: z.number().int().min(0).max(1_000_000), organizationAccounts: z.number().int().min(0).max(1_000_000), governmentAccounts: z.number().int().min(0).max(1_000_000), cacFast: z.number().int().min(0).max(1_000_000), cards: z.number().int().min(0).max(1_000_000), transfers: z.number().int().min(0).max(1_000_000), digitalServices: z.number().int().min(0).max(1_000_000), visitsCount: z.number().int().min(0).max(1_000_000), meetingsCount: z.number().int().min(0).max(1_000_000), callsCount: z.number().int().min(0).max(1_000_000), newCustomers: z.number().int().min(0).max(1_000_000), newOpportunities: z.number().int().min(0).max(1_000_000), followups: z.number().int().min(0).max(1_000_000), obstacles: z.string().max(4000).optional(), needs: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "report");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      if (input.reportDate > todayKey()) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حفظ تقرير يومي بتاريخ مستقبلي." });
      const reportDate = asDate(input.reportDate);
      const userId = ctx.user.id;
      const { id, reportDate: _reportDate, ...rest } = input;
      const payload = { ...rest, userId, reportDate, obstacles: input.obstacles || null, needs: input.needs || null };
      let previous: typeof dailyReports.$inferSelect | undefined;
      if (id) {
        const [row] = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "التقرير اليومي غير موجود." });
        previous = row;
        if (dateLabel(row.reportDate) !== input.reportDate) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تغيير تاريخ التقرير بعد إنشائه." });
      } else {
        const [row] = await db.select().from(dailyReports).where(and(eq(dailyReports.branchId, input.branchId), eq(dailyReports.userId, userId), eq(dailyReports.reportDate, reportDate))).limit(1);
        previous = row;
      }
      if (previous) {
        assertBranchWrite(ctx.user, previous.branchId, "report");
        if (previous.branchId !== input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل التقرير إلى فرع آخر." });
        if (roleOf(ctx.user) === "branch_employee" && previous.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تعديل تقرير موظف آخر." });
        await db.update(dailyReports).set(payload).where(eq(dailyReports.id, previous.id));
      }
      const idValue = previous?.id ?? Number(((await db.insert(dailyReports).values(payload))[0] as { insertId?: number }).insertId);
      const fields = [["individualAccounts", "individual_accounts"], ["companyAccounts", "company_accounts"], ["organizationAccounts", "organization_accounts"], ["governmentAccounts", "government_accounts"], ["cacFast", "cac_fast"], ["cards", "cards"], ["transfers", "transfers"], ["digitalServices", "digital_services"], ["visitsCount", "visits"], ["meetingsCount", "meetings"], ["callsCount", "calls"], ["newCustomers", "new_customers"], ["newOpportunities", "new_opportunities"], ["followups", "followups"]] as const;
      for (const [field, metricCode] of fields) {
        const before = previous?.status === "submitted" ? parseCount(previous[field]) : 0;
        const after = input.status === "submitted" ? parseCount(input[field]) : 0;
        await recordPerformance(db, input.branchId, metricCode, after - before, userId, input.reportDate);
      }
      const auditFields = ["individualAccounts", "companyAccounts", "organizationAccounts", "governmentAccounts", "cacFast", "cards", "transfers", "digitalServices", "visitsCount", "meetingsCount", "callsCount", "newCustomers", "newOpportunities", "followups"] as const;
      const previousMetrics = previous ? Object.fromEntries(auditFields.map(field => [field, previous[field]])) : undefined;
      const nextMetrics = Object.fromEntries(auditFields.map(field => [field, input[field]]));
      await audit(db, userId, previous ? "update" : "create", "daily_report", idValue, previous ? { branchId: previous.branchId, reportDate: dateLabel(previous.reportDate), status: previous.status, metrics: previousMetrics } : undefined, { branchId: input.branchId, reportDate: input.reportDate, status: input.status, metrics: nextMetrics });
      return { id: idValue };
    }),
  }),

  quality: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireRoles(ctx.user, qualityReadRoles);
      const db = await dbOrThrow();
      const [reviewRows, complaintRows, findingRows, actionRows, branchRows] = await Promise.all([
        db.select().from(qualityReviews).orderBy(desc(qualityReviews.reviewDate)), db.select().from(complaints).orderBy(desc(complaints.complaintDate)),
        db.select().from(qualityFindings), db.select().from(correctiveActions), db.select().from(branches),
      ]);
      return { reviews: scoped(ctx.user, reviewRows), complaints: scoped(ctx.user, complaintRows), findings: scoped(ctx.user, findingRows), actions: scoped(ctx.user, actionRows), branches: branchRows.filter(branch => branchScope(ctx.user) === undefined || branch.id === branchScope(ctx.user)) };
    }),
    createComplaint: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), complaintType: z.string().min(2).max(120), complaintDate: dateInput, ownerName: z.string().max(160).optional(), processingDays: z.number().int().min(0).max(3650).default(0), status: z.enum(["open", "in_progress", "resolved", "closed"]), details: z.string().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "quality");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const payload = { ...input, complaintDate: asDate(input.complaintDate) };
      const [result] = await db.insert(complaints).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "complaint", id, undefined, { branchId: input.branchId, complaintType: input.complaintType, complaintDate: input.complaintDate, status: input.status, processingDays: input.processingDays });
      return { id };
    }),
    createFinding: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), finding: z.string().min(3).max(4000), severity: z.enum(["low", "medium", "high", "critical"]), ownerName: z.string().max(160).optional(), dueDate: dateInput.optional(), status: z.enum(["open", "in_progress", "resolved", "closed"]) })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "quality");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const payload = { ...input, dueDate: input.dueDate ? asDate(input.dueDate) : null };
      const [result] = await db.insert(qualityFindings).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "quality_finding", id, undefined, { branchId: input.branchId, severity: input.severity, dueDate: input.dueDate ?? null, status: input.status });
      return { id };
    }),
    createAction: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), action: z.string().min(3).max(4000), ownerName: z.string().max(160).optional(), executionDate: dateInput.optional(), progress: z.number().int().min(0).max(100), status: z.enum(["open", "in_progress", "closed"]) })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "quality");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const payload = { ...input, executionDate: input.executionDate ? asDate(input.executionDate) : null };
      const [result] = await db.insert(correctiveActions).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "corrective_action", id, undefined, { branchId: input.branchId, executionDate: input.executionDate ?? null, progress: input.progress, status: input.status });
      return { id };
    }),
    createReview: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), reviewDate: dateInput, reception: z.number().int().min(0).max(100), speed: z.number().int().min(0).max(100), accuracy: z.number().int().min(0).max(100), customerExperience: z.number().int().min(0).max(100), procedures: z.number().int().min(0).max(100), forms: z.number().int().min(0).max(100), kyc: z.number().int().min(0).max(100), instructions: z.number().int().min(0).max(100), reviewer: z.string().max(160).optional(), notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      assertBranchWrite(ctx.user, input.branchId, "quality");
      const db = await dbOrThrow();
      await assertBranchExists(db, input.branchId);
      const payload = { ...input, reviewDate: asDate(input.reviewDate) };
      const [result] = await db.insert(qualityReviews).values(payload);
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "quality_review", id, undefined, { branchId: input.branchId, reviewDate: input.reviewDate, reception: input.reception, speed: input.speed, accuracy: input.accuracy, customerExperience: input.customerExperience, procedures: input.procedures, forms: input.forms, kyc: input.kyc, instructions: input.instructions });
      return { id };
    }),
    updateComplaint: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]), processingDays: z.number().int().min(0).max(3650).optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [row] = await db.select().from(complaints).where(eq(complaints.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الشكوى غير موجودة." });
      assertBranchWrite(ctx.user, row.branchId, "quality");
      await db.update(complaints).set({ status: input.status, processingDays: input.processingDays ?? row.processingDays }).where(eq(complaints.id, row.id));
      await audit(db, ctx.user.id, "update", "complaint", row.id, { status: row.status, processingDays: row.processingDays }, { status: input.status, processingDays: input.processingDays ?? row.processingDays });
      return { success: true };
    }),
    updateFinding: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [row] = await db.select().from(qualityFindings).where(eq(qualityFindings.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الملاحظة غير موجودة." });
      assertBranchWrite(ctx.user, row.branchId, "quality");
      await db.update(qualityFindings).set({ status: input.status }).where(eq(qualityFindings.id, row.id));
      await audit(db, ctx.user.id, "update", "quality_finding", row.id, { status: row.status }, { status: input.status });
      return { success: true };
    }),
    updateAction: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "closed"]), progress: z.number().int().min(0).max(100) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [row] = await db.select().from(correctiveActions).where(eq(correctiveActions.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الإجراء التصحيحي غير موجود." });
      assertBranchWrite(ctx.user, row.branchId, "quality");
      const progress = input.status === "closed" ? 100 : input.progress;
      await db.update(correctiveActions).set({ status: input.status, progress }).where(eq(correctiveActions.id, row.id));
      await audit(db, ctx.user.id, "update", "corrective_action", row.id, { status: row.status, progress: row.progress }, { status: input.status, progress });
      return { success: true };
    }),
  }),

  reports: router({
    monthly: protectedProcedure.input(z.object({ month: monthInput.optional() }).optional()).query(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin", "executive", "business_development", "quality", "branch_manager"]);
      const db = await dbOrThrow();
      const scope = branchScope(ctx.user);
      const currentMonth = todayKey().slice(0, 7);
      const month = input?.month ?? currentMonth;
      const start = asDate(`${month}-01`);
      if (month > currentMonth) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إنشاء تقرير لشهر مستقبلي." });
      const end = month === currentMonth ? asDate(todayKey()) : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
      const [branchRows, performanceRows, targetRows] = await Promise.all([
        db.select().from(branches),
        db.select().from(performance).where(and(gte(performance.periodDate, start), lte(performance.periodDate, end))),
        db.select().from(targets).where(eq(targets.interval, "monthly")),
      ]);
      const visibleBranches = branchRows.filter(branch => scope === undefined || (scope >= 0 && branch.id === scope));
      return visibleBranches.map(branch => {
        const metricTotals: Record<string, number> = {};
        for (const row of performanceRows) if (row.branchId === branch.id) metricTotals[row.metricCode] = (metricTotals[row.metricCode] ?? 0) + parseCount(row.actualValue);
        const accounts = ["individual_accounts", "company_accounts", "organization_accounts", "government_accounts"].reduce((sum, key) => sum + (metricTotals[key] ?? 0), 0);
        const target = targetRows.filter(item => item.branchId === branch.id && item.metricCode === "new_customers" && item.interval === "monthly" && dateLabel(item.periodStart).slice(0, 7) === dateLabel(start).slice(0, 7)).reduce((sum, item) => sum + parseCount(item.targetValue), 0);
        const actual = metricTotals.new_customers ?? 0;
        return { branchId: branch.id, branch: branch.nameAr, period: dateLabel(start), customers: actual, accounts, deposits: metricTotals.deposits ?? 0, financing: metricTotals.financing ?? 0, visits: metricTotals.visits ?? 0, target, achievement: target > 0 ? actual / target * 100 : 0 };
      });
    }),
    list: protectedProcedure.input(z.object({ search: z.string().max(120).optional() }).optional()).query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const rows = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
      const role = roleOf(ctx.user);
      let visible = rows.filter(item => {
        if (item.branchId === null) return ["super_admin", "executive", "business_development", "quality"].includes(role);
        const scope = branchScope(ctx.user);
        return scope === undefined || (scope >= 0 && scope === item.branchId);
      });
      if (role === "branch_employee") visible = visible.filter(item => item.createdBy === ctx.user.id);
      if (input?.search) visible = visible.filter(item => `${item.title} ${item.reportType}`.toLowerCase().includes(input.search!.toLowerCase()));
      return visible;
    }),
    weekly: protectedProcedure.input(z.object({ branchId: z.number().int().positive().optional(), start: dateInput.optional() }).optional()).mutation(async ({ ctx, input }) => {
      requireRoles(ctx.user, ["super_admin", "executive", "business_development", "quality", "branch_manager"]);
      const db = await dbOrThrow();
      const selectedBranch = effectiveBranchId(ctx.user, input?.branchId);
      const currentDay = todayKey();
      const currentDayStart = asDate(currentDay);
      const start = input?.start ? asDate(input.start) : new Date(currentDayStart.getTime() - 6 * 86400000);
      if (start > currentDayStart) throw new TRPCError({ code: "BAD_REQUEST", message: "بداية الفترة لا يمكن أن تكون بعد اليوم." });
      if (selectedBranch !== undefined) await assertBranchExists(db, selectedBranch);
      const end = sevenDayPeriodEnd(start, currentDayStart);
      const timestampStart = businessDayStartUtc(dateLabel(start));
      const timestampEnd = businessDayEndUtc(dateLabel(end));
      if (!timestampStart || !timestampEnd) throw new TRPCError({ code: "BAD_REQUEST", message: "نطاق التاريخ غير صالح." });
      const { start: previousStart, end: previousEnd } = previousComparablePeriod(start, end);
      const perfRows = await db.select().from(performance).where(and(gte(performance.periodDate, previousStart), lte(performance.periodDate, end)));
      const inScope = (branchId: number) => selectedBranch === undefined || branchId === selectedBranch;
      const sumMetrics = (rows: typeof perfRows) => {
        const values: Record<string, number> = {};
        for (const row of rows) if (inScope(row.branchId)) values[row.metricCode] = (values[row.metricCode] ?? 0) + parseCount(row.actualValue);
        return values;
      };
      const currentTotals = sumMetrics(perfRows.filter(row => row.periodDate >= start && row.periodDate <= end));
      const previousTotals = sumMetrics(perfRows.filter(row => row.periodDate >= previousStart && row.periodDate <= previousEnd));
      const accountCodes = ["individual_accounts", "company_accounts", "organization_accounts", "government_accounts"];
      const sumKeys = (values: Record<string, number>, keys: string[]) => keys.reduce((sum, key) => sum + (values[key] ?? 0), 0);
      const accounts = sumKeys(currentTotals, accountCodes);
      const previousAccounts = sumKeys(previousTotals, accountCodes);
      const newCustomers = currentTotals.new_customers ?? 0;
      const previousCustomers = previousTotals.new_customers ?? 0;
      const growth = (current: number, previous: number) => previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;
      const [prospectRows, visitRows, dailyRows, targetRows, allBranches] = await Promise.all([
        db.select().from(prospects), db.select().from(visits), db.select().from(dailyReports),
        db.select().from(targets), db.select().from(branches),
      ]);
      const scopedProspects = prospectRows.filter(item => inScope(item.branchId));
      const newProspects = scopedProspects.filter(item => item.createdAt >= timestampStart && item.createdAt <= timestampEnd).length;
      const scopedVisits = visitRows.filter(item => inScope(item.branchId) && item.visitAt >= timestampStart && item.visitAt <= timestampEnd);
      const dailyInPeriod = dailyRows.filter(item => inScope(item.branchId) && item.reportDate >= start && item.reportDate <= end);
      const monthlyTarget = targetRows.filter(item => item.metricCode === "new_customers" && item.interval === "monthly" && inScope(item.branchId) && dateLabel(item.periodStart).slice(0, 7) === dateLabel(end).slice(0, 7)).reduce((sum, item) => sum + parseCount(item.targetValue), 0);
      const savedWeeklyTargets = targetRows.filter(item => item.metricCode === "new_customers" && item.interval === "weekly" && inScope(item.branchId) && dateLabel(item.periodStart) === dateLabel(start));
      const weeklyTarget = savedWeeklyTargets.length ? savedWeeklyTargets.reduce((sum, item) => sum + parseCount(item.targetValue), 0) : monthlyTarget / 4.345;
      const targetBasis = savedWeeklyTargets.length ? "مستهدف أسبوعي محفوظ" : "تقدير من المستهدف الشهري";
      const achievementPercent = weeklyTarget > 0 ? Math.round(newCustomers / weeklyTarget * 1000) / 10 : 0;
      const obstacles = Array.from(new Set(dailyInPeriod.map(item => item.obstacles).filter((item): item is string => Boolean(item))));
      const needs = Array.from(new Set(dailyInPeriod.map(item => item.needs).filter((item): item is string => Boolean(item))));
      const conversionCount = scopedProspects.filter(item => item.status === "converted" && item.updatedAt >= timestampStart && item.updatedAt <= timestampEnd).length;
      const data = {
        summary: `من ${dateLabel(start)} إلى ${dateLabel(end)}: ${newCustomers} عميلاً جديداً، ${accounts} حساباً، ${scopedVisits.length} زيارة، وتحقيق ${targetBasis} بنسبة ${achievementPercent}%.`,
        currentTotals, previousTotals,
        comparison: { newCustomersGrowthPercent: growth(newCustomers, previousCustomers), accountGrowthPercent: growth(accounts, previousAccounts), achievementPercent, targetBasis },
        newCustomers, newAccounts: accounts, deposits: currentTotals.deposits ?? 0, financing: currentTotals.financing ?? 0,
        fieldActivity: { visits: scopedVisits.length, meetings: currentTotals.meetings ?? 0, calls: currentTotals.calls ?? 0 },
        newProspects, converted: conversionCount, weeklyTarget, targetBasis,
        conversionRatePercent: scopedProspects.length ? Math.round(conversionCount / scopedProspects.length * 1000) / 10 : 0,
        visits: scopedVisits.length, opportunities: scopedProspects.filter(item => ["negotiation", "following_up"].includes(item.status)).length,
        obstacles: obstacles.join("؛ ") || "لا توجد معوقات مسجلة في التقارير اليومية.",
        needs: needs.join("؛ ") || "لا توجد احتياجات مدخلة.",
        actions: "متابعة العملاء ذوي المواعيد القادمة، ومراجعة الفروع الأقل إنجازاً، وتحديث الإجراءات التصحيحية المفتوحة.",
        nextWeekPlan: "تحديد أولويات الزيارات، متابعة الفرص المفتوحة، وتعزيز إكمال التقارير اليومية في الوقت المحدد.",
        branchCount: allBranches.filter(branch => inScope(branch.id)).length,
        demoData: true,
      };
      const [result] = await db.insert(reports).values({ reportType: "weekly", title: `التقرير الأسبوعي — ${dateLabel(start)} إلى ${dateLabel(end)}`, branchId: selectedBranch ?? null, periodStart: start, periodEnd: end, reportData: data, createdBy: ctx.user.id });
      const id = Number((result as { insertId?: number }).insertId);
      await audit(db, ctx.user.id, "create", "report", id, undefined, { reportType: "weekly", periodStart: start, periodEnd: end });
      return { id, ...data, periodStart: dateLabel(start), periodEnd: dateLabel(end) };
    }),
    recordDaily: protectedProcedure.input(z.object({ branchId: z.number().int().positive(), reportDate: dateInput, userId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      assertBranchRead(ctx.user, input.branchId);
      const db = await dbOrThrow();
      let rows = await db.select().from(dailyReports).where(and(eq(dailyReports.branchId, input.branchId), eq(dailyReports.reportDate, asDate(input.reportDate)))).orderBy(desc(dailyReports.updatedAt));
      if (roleOf(ctx.user) === "branch_employee") rows = rows.filter(item => item.userId === ctx.user.id);
      return rows;
    }),
  }),

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const canReadProspectDetails = canReadProspects(ctx.user);
      const [stored, model, prospectRows, reportRows] = await Promise.all([
        db.select().from(notifications).orderBy(desc(notifications.createdAt)), buildDashboard(ctx.user),
        canReadProspectDetails ? db.select().from(prospects) : Promise.resolve([] as Array<typeof prospects.$inferSelect>),
        db.select().from(dailyReports),
      ]);
      const scope = branchScope(ctx.user);
      const role = roleOf(ctx.user);
      const visibleStored = stored.filter(item => (item.userId === null || item.userId === ctx.user.id) && (scope === undefined || item.branchId === null || item.branchId === scope));
      const dynamic = model.branches.flatMap(branch => {
        const output: Array<{ id: string; type: string; title: string; body: string; branchId: number; isRead: boolean; createdAt: string }> = [];
        const createdAt = new Date().toISOString();
        if (branch.growth < -20) output.push({ id: `decline-${branch.id}`, type: "danger", title: "انخفاض في الأداء", body: `تراجع مؤشر العملاء الجدد في ${branch.nameAr} بأكثر من 20%.`, branchId: branch.id, isRead: false, createdAt });
        if (branch.achievement > 100) output.push({ id: `target-${branch.id}`, type: "success", title: "إنجاز المستهدف", body: `تجاوز ${branch.nameAr} مستهدف العملاء الجدد.`, branchId: branch.id, isRead: false, createdAt });
        const hasReport = reportRows.some(report => report.branchId === branch.id && dateLabel(report.reportDate) === todayKey() && (role !== "branch_employee" || report.userId === ctx.user.id));
        if (!hasReport) output.push({ id: `report-${branch.id}`, type: "reminder", title: "التقرير اليومي غير مرسل", body: role === "branch_employee" ? "لم ترسل تقريرك اليومي بعد." : `لم يُسجل تقرير اليوم لفرع ${branch.nameAr}.`, branchId: branch.id, isRead: false, createdAt });
        const currentProspects = branch.metricValues.prospects;
        const oldProspects = branch.metricPrevious.prospects;
        const currentRate = currentProspects > 0 ? branch.metricValues.converted / currentProspects : 0;
        const oldRate = oldProspects > 0 ? branch.metricPrevious.converted / oldProspects : 0;
        if (oldProspects > 0 && currentRate < oldRate) output.push({ id: `conversion-${branch.id}`, type: "warning", title: "انخفاض في معدل التحويل", body: `انخفض معدل تحويل العملاء المحتملين في ${branch.nameAr} عن خط الأساس المقارن.`, branchId: branch.id, isRead: false, createdAt });
        return output;
      });
      if (canReadProspectDetails) {
        const overdue = prospectRows.filter(item => item.nextFollowupAt && dateLabel(item.nextFollowupAt) <= todayKey() && !["converted", "not_interested"].includes(item.status) && (scope === undefined || item.branchId === scope) && (role !== "branch_employee" || (ctx.user.employeeId ? item.employeeId === ctx.user.employeeId : item.createdBy === ctx.user.id)));
        for (const item of overdue.slice(0, 20)) dynamic.push({ id: `followup-${item.id}`, type: "info", title: "متابعة مطلوبة", body: `تحتاج متابعة العميل المحتمل: ${item.name}.`, branchId: item.branchId, isRead: false, createdAt: new Date().toISOString() });
      }
      return [...dynamic, ...visibleStored.map(item => ({ ...item, createdAt: item.createdAt.toISOString() }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const scope = branchScope(ctx.user);
      const ownerCondition = or(eq(notifications.userId, ctx.user.id), sql`${notifications.userId} is null`);
      const branchCondition = scope === undefined ? undefined : scope < 0 ? eq(notifications.id, -1) : or(eq(notifications.branchId, scope), sql`${notifications.branchId} is null`);
      await db.update(notifications).set({ isRead: true }).where(branchCondition ? and(eq(notifications.id, input.id), ownerCondition, branchCondition) : and(eq(notifications.id, input.id), ownerCondition));
      return { success: true };
    }),
  }),
};
