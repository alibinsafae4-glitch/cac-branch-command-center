import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { businessDateKey } from "../shared/date";
import {
  appSettings,
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
  roles,
  squareAssignments,
  squares,
  targets,
  visits,
} from "../drizzle/schema";

const demoBranches = [
  { code: "CR", nameAr: "فرع كريتر", nameEn: "Crater Branch", branchType: "فرع" as const, managerName: "مدير فرع كريتر", headcount: 24 },
  { code: "MN", nameAr: "فرع المنصورة", nameEn: "Mansoura Branch", branchType: "فرع" as const, managerName: "مدير فرع المنصورة", headcount: 31 },
  { code: "SO", nameAr: "فرع الشيخ عثمان", nameEn: "Sheikh Othman Branch", branchType: "فرع" as const, managerName: "مدير فرع الشيخ عثمان", headcount: 28 },
  { code: "BR", nameAr: "مكتب البريقة", nameEn: "Al-Buraiqah Office", branchType: "مكتب_فرعي" as const, managerName: "مسؤول مكتب البريقة", parentBranchCode: "SO", headcount: 9 },
  { code: "NK", nameAr: "فرع النخبة", nameEn: "Al-Nukhba Branch", branchType: "فرع" as const, managerName: "مدير فرع النخبة", headcount: 18 },
  { code: "KI", nameAr: "فرع كاك الإسلامي", nameEn: "CAC Islamic Branch", branchType: "إسلامي" as const, managerName: "مدير كاك الإسلامي", headcount: 22 },
];

const metrics = [
  ["new_customers", "العملاء الجدد", 22],
  ["individual_accounts", "حسابات الأفراد", 18],
  ["company_accounts", "حسابات الشركات", 6],
  ["organization_accounts", "حسابات المنظمات", 3],
  ["government_accounts", "الحسابات الحكومية", 2],
  ["deposits", "الودائع الجديدة", 12500000],
  ["financing", "التمويلات", 7200000],
  ["cards", "البطاقات", 16],
  ["cac_fast", "CAC Fast", 28],
  ["digital_services", "الخدمات الرقمية", 34],
  ["visits", "الزيارات الميدانية", 13],
  ["meetings", "الاجتماعات", 7],
  ["calls", "الاتصالات", 41],
  ["followups", "المتابعات", 26],
  ["transfers", "الحوالات", 17],
  ["prospects", "العملاء المحتملون", 19],
  ["تم_الاستقطاب", "العملاء المستقطبون", 8],
] as const;

const roleRows = [
  { roleKey: "مدير_النظام", nameAr: "مدير النظام", permissions: ["all"] },
  { roleKey: "الإدارة_العليا", nameAr: "الإدارة العليا", permissions: ["dashboard.read", "reports.read", "intelligence.read", "alerts.read"] },
  { roleKey: "تطوير_الأعمال", nameAr: "تطوير الأعمال", permissions: ["branches.read", "prospects.manage", "visits.manage", "squares.read", "targets.read", "reports.read"] },
  { roleKey: "توكيد_الجودة", nameAr: "توكيد الجودة", permissions: ["branches.read", "quality.manage", "reports.read", "alerts.read"] },
  { roleKey: "مدير_الفرع", nameAr: "مدير الفرع", permissions: ["branch.read", "branch.write", "prospects.manage", "visits.manage", "reports.manage", "quality.read"] },
  { roleKey: "موظف_الفرع", nameAr: "موظف الفرع", permissions: ["assigned_prospects.manage", "assigned_visits.manage", "daily_reports.manage"] },
];

const dateKey = (value: Date) => businessDateKey(value);
const dateValue = (value: Date | string) => new Date(`${typeof value === "string" ? value : dateKey(value)}T00:00:00.000Z`);

export async function ensureDemoSeed() {
  const db = await getDb();
  if (!db) return;
  const setting = await db.select().from(appSettings).where(eq(appSettings.settingKey, "demo_seed_v1")).limit(1);
  if (setting.length) return;

  await db.insert(roles).values(roleRows).onDuplicateKeyUpdate({ set: { nameAr: sql`values(nameAr)`, permissions: sql`values(permissions)` } });
  const existingBranches = await db.select().from(branches);
  const branchMap = new Map(existingBranches.map(branch => [branch.code, branch.id]));
  for (const row of demoBranches) {
    if (!branchMap.has(row.code)) {
      await db.insert(branches).values(row);
    }
  }
  const allBranches = await db.select().from(branches);
  for (const branch of allBranches) branchMap.set(branch.code, branch.id);

  const employeesNow = await db.select({ id: employees.id }).from(employees).limit(1);
  if (!employeesNow.length) {
    for (const branch of allBranches) {
      await db.insert(employees).values([
        { employeeCode: `${branch.code}-D01`, name: `موظف تجريبي ${branch.nameAr}`, title: "مسؤول علاقات", branchId: branch.id, isDemo: true },
        { employeeCode: `${branch.code}-D02`, name: `موظف ميداني ${branch.nameAr}`, title: "تطوير أعمال", branchId: branch.id, isDemo: true },
      ]);
    }
  }

  const now = new Date();
  const todayKey = dateKey(now);
  const today = dateValue(todayKey);
  const currentMonth = `${todayKey.slice(0, 7)}-01`;
  const performanceRows = await db.select({ id: performance.id }).from(performance).limit(1);
  if (!performanceRows.length) {
    const perfValues: Array<typeof performance.$inferInsert> = [];
    for (const branch of allBranches) {
      for (let week = 0; week < 12; week++) {
        const period = new Date(now);
        period.setDate(period.getDate() - (week * 7));
        const periodDate = dateValue(period);
        for (const [metricCode, _label, baseline] of metrics) {
          const actual = Math.max(1, Math.round(baseline * (0.58 + ((branch.id * 17 + week * 9) % 60) / 100)));
          perfValues.push({ branchId: branch.id, periodDate, metricCode, actualValue: String(actual), previousValue: String(Math.max(1, Math.round(actual * (0.84 + ((week + branch.id) % 30) / 100)))) });
        }
      }
      for (const [metricCode, label, baseline] of metrics) {
        const targetScale = metricCode === "deposits" || metricCode === "financing" ? 2 : 1;
        await db.insert(targets).values({ branchId: branch.id, metricCode, metricName: label, interval: "شهري", periodStart: dateValue(currentMonth), targetValue: String(baseline * targetScale) }).onDuplicateKeyUpdate({ set: { targetValue: sql`targetValue` } });
      }
    }
    for (let offset = 0; offset < perfValues.length; offset += 250) {
      await db.insert(performance).values(perfValues.slice(offset, offset + 250)).onDuplicateKeyUpdate({ set: { actualValue: sql`actualValue` } });
    }
  }

  const squareRows = await db.select({ id: squares.id }).from(squares).limit(1);
  if (!squareRows.length) {
    const branchByCode = Object.fromEntries(allBranches.map(branch => [branch.code, branch.id]));
    const employeesByBranch = await db.select().from(employees);
    const employeeByBranch = new Map<number, number>();
    for (const employee of employeesByBranch) if (!employeeByBranch.has(employee.branchId)) employeeByBranch.set(employee.branchId, employee.id);
    for (let n = 1; n <= 15; n++) {
      const row = Math.floor((n - 1) / 3);
      const col = (n - 1) % 3;
      const south = 12.72 + row * 0.025;
      const west = 44.96 + col * 0.028;
      const polygon: Array<[number, number]> = [
        [south, west], [south, west + 0.028], [south + 0.025, west + 0.028], [south + 0.025, west], [south, west],
      ];
      const primaryCode = n <= 5 ? "MN" : n <= 11 ? "SO" : n <= 14 ? "CR" : "NK";
      const [created] = await db.insert(squares).values({
        squareNumber: n,
        name: `مربع ${String(n).padStart(2, "0")}`,
        region: "عدن — تقسيم تجريبي",
        polygon,
        entitiesCount: 45 + ((n * 13) % 52),
        companiesCount: 14 + ((n * 7) % 28),
        organizationsCount: 2 + (n % 8),
        merchantsCount: 18 + ((n * 11) % 37),
        targetValue: 35 + (n % 22),
      });
      const squareId = Number((created as { insertId?: number }).insertId);
      const primaryId = branchByCode[primaryCode];
      if (squareId && primaryId) {
        await db.insert(squareAssignments).values([
          { squareId, branchId: primaryId, employeeId: employeeByBranch.get(primaryId) ?? null, isPrimary: true },
          { squareId, branchId: branchByCode.KI, employeeId: employeeByBranch.get(branchByCode.KI) ?? null, isPrimary: false },
        ]);
      }
    }
  }

  const prospectRows = await db.select({ id: prospects.id }).from(prospects).limit(1);
  if (!prospectRows.length) {
    const allSquares = await db.select().from(squares);
    const allEmployees = await db.select().from(employees);
    const fakeNames = ["مؤسسة الأفق للخدمات (تجريبي)", "شركة الميناء التجارية (تجريبي)", "مبادرة التنمية المجتمعية (تجريبي)", "متجر النورس النموذجي (تجريبي)", "مجموعة الرواد (تجريبي)", "مكتب المدار الافتراضي (تجريبي)"];
    const demoProspects: Array<typeof prospects.$inferInsert> = [];
    for (let i = 0; i < 30; i++) {
      const branch = allBranches[i % allBranches.length];
      const employee = allEmployees.find(item => item.branchId === branch.id);
      const square = allSquares[i % allSquares.length];
      const statuses = ["جديد", "تم_التواصل", "تمت_الزيارة", "قيد_المتابعة", "قيد_التفاوض", "تم_الاستقطاب", "مؤجل"] as const;
      const first = new Date(now); first.setDate(first.getDate() - (i % 18));
      const next = new Date(now); next.setDate(next.getDate() + ((i % 5) - 2));
      demoProspects.push({
        name: `${fakeNames[i % fakeNames.length]} ${String(i + 1).padStart(2, "0")}`,
        customerType: i % 3 === 0 ? "شركة" : i % 3 === 1 ? "منظمة" : "تاجر",
        sector: ["تجارة", "خدمات", "منظمات", "اتصالات", "صناعة"][i % 5],
        activity: "نشاط افتراضي لأغراض العرض",
        address: "موقع تجريبي — عدن",
        squareId: square.id,
        branchId: branch.id,
        employeeId: employee?.id ?? null,
        firstContactDate: dateValue(first),
        lastFollowupAt: dateValue(first),
        nextFollowupAt: dateValue(next),
        products: "حساب أعمال، CAC Fast",
        expectedValue: String(250000 + (i * 125000)),
        status: statuses[i % statuses.length],
        notes: "سجل تجريبي؛ لا يمثل عميلاً حقيقياً.",
        isDemo: true,
      });
    }
    await db.insert(prospects).values(demoProspects);
  }

  const visitRows = await db.select({ id: visits.id }).from(visits).limit(1);
  if (!visitRows.length) {
    const allEmployees = await db.select().from(employees);
    const allSquares = await db.select().from(squares);
    const prospectsList = await db.select().from(prospects).limit(14);
    for (let i = 0; i < 18; i++) {
      const branch = allBranches[i % allBranches.length];
      const employee = allEmployees.find(item => item.branchId === branch.id);
      const visitAt = new Date(now); visitAt.setDate(visitAt.getDate() - (i % 12));
      await db.insert(visits).values({
        agencyName: `جهة افتراضية ${String(i + 1).padStart(2, "0")}`,
        agencyType: i % 2 ? "شركة" : "منظمة",
        prospectId: prospectsList[i % Math.max(prospectsList.length, 1)]?.id ?? null,
        squareId: allSquares[i % allSquares.length]?.id ?? null,
        branchId: branch.id,
        employeeId: employee?.id ?? null,
        visitAt,
        location: "عدن — موقع تقريبي تجريبي",
        visitType: i % 2 ? "زيارة استقطاب" : "متابعة",
        personMet: "جهة اتصال افتراضية",
        result: "تم التعريف بالخدمات ومتابعة الاحتياج",
        products: "حسابات أعمال، خدمات رقمية",
        opportunities: "فرصة متابعة تجريبية",
        notes: "بيانات تجريبية فقط.",
        nextAction: "التواصل والمتابعة",
        isDemo: true,
      });
    }
  }

  const reportRows = await db.select({ id: dailyReports.id }).from(dailyReports).limit(1);
  if (!reportRows.length) {
    for (const branch of allBranches) {
      await db.insert(dailyReports).values({
        branchId: branch.id,
        userId: 0,
        reportDate: today,
        individualAccounts: 7 + (branch.id % 5),
        companyAccounts: 2 + (branch.id % 3),
        organizationAccounts: branch.id % 3,
        governmentAccounts: branch.id % 2,
        cacFast: 5 + (branch.id % 6),
        cards: 3 + (branch.id % 5),
        transfers: 4 + (branch.id % 7),
        digitalServices: 8 + (branch.id % 9),
        visitsCount: 2 + (branch.id % 5),
        meetingsCount: 1 + (branch.id % 4),
        callsCount: 5 + (branch.id % 9),
        newCustomers: 3 + (branch.id % 6),
        newOpportunities: 2 + (branch.id % 5),
        followups: 4 + (branch.id % 7),
        obstacles: "لا توجد معوقات تشغيلية مهمة (سجل تجريبي).",
        needs: "متابعة الاحتياجات المسجلة للفرع (سجل تجريبي).",
        status: "مرسل",
      });
    }
  }

  const qualityRows = await db.select({ id: qualityReviews.id }).from(qualityReviews).limit(1);
  if (!qualityRows.length) {
    for (const branch of allBranches) {
      await db.insert(qualityReviews).values({
        branchId: branch.id, reviewDate: today,
        reception: 76 + (branch.id * 3) % 20,
        speed: 70 + (branch.id * 5) % 25,
        accuracy: 82 + (branch.id * 2) % 17,
        customerExperience: 75 + (branch.id * 4) % 22,
        procedures: 84 + (branch.id * 2) % 15,
        forms: 80 + (branch.id * 3) % 19,
        kyc: 86 + (branch.id * 2) % 13,
        instructions: 88 + (branch.id * 3) % 11,
        reviewer: "فريق جودة افتراضي",
        notes: "تقييم توضيحي تجريبي.",
      });
    }
    await db.insert(complaints).values([
      { complaintType: "تأخر خدمة (تجريبي)", branchId: allBranches[0].id, complaintDate: today, ownerName: "مسؤول افتراضي", processingDays: 2, status: "قيد_التنفيذ", details: "شكوى اصطناعية للعرض فقط." },
      { complaintType: "استفسار خدمة (تجريبي)", branchId: allBranches[1].id, complaintDate: today, ownerName: "مسؤول افتراضي", processingDays: 1, status: "مفتوح", details: "شكوى اصطناعية للعرض فقط." },
    ]);
    await db.insert(qualityFindings).values({ branchId: allBranches[0].id, finding: "استكمال قائمة تحقق توضيحية — مثال تجريبي.", severity: "متوسط", ownerName: "مسؤول افتراضي", dueDate: today, status: "مفتوح" });
    await db.insert(correctiveActions).values({ branchId: allBranches[0].id, action: "تحديث إجراء تشغيلي افتراضي للمراجعة.", ownerName: "مسؤول افتراضي", executionDate: today, progress: 40, status: "قيد_التنفيذ" });
  }

  const weights = await db.select({ metricCode: branchScoreWeights.metricCode }).from(branchScoreWeights).limit(1);
  if (!weights.length) {
    await db.insert(branchScoreWeights).values([
      { metricCode: "commercial", metricName: "الأداء التجاري", weightPercent: 30 },
      { metricCode: "acquisition", metricName: "استقطاب العملاء", weightPercent: 20 },
      { metricCode: "deposits", metricName: "الودائع", weightPercent: 15 },
      { metricCode: "field_activity", metricName: "النشاط الميداني", weightPercent: 10 },
      { metricCode: "digital", metricName: "الخدمات الرقمية", weightPercent: 10 },
      { metricCode: "quality", metricName: "جودة الخدمة", weightPercent: 10 },
      { metricCode: "compliance", metricName: "الالتزام", weightPercent: 5 },
    ]);
  }

  const notificationRows = await db.select({ id: notifications.id }).from(notifications).limit(1);
  if (!notificationRows.length) {
    await db.insert(notifications).values([
      { type: "تحذير", title: "مراجعة الأداء", body: "أحد مؤشرات الأداء يحتاج إلى متابعة هذا الأسبوع (تنبيه تجريبي).", branchId: allBranches[2].id },
      { type: "معلومات", title: "تقرير اليوم", body: "تقرير الفرع التجريبي جاهز للمراجعة.", branchId: allBranches[0].id },
    ]);
  }

  await db.insert(appSettings).values({ settingKey: "demo_seed_v1", settingValue: { version: 1, seededAt: now.toISOString() } });
}
