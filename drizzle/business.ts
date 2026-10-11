import {
  boolean,
  date,
  decimal,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { branches, employees, squares, users } from "./core";

export const roles = mysqlTable("الأدوار", {
  roleKey: varchar("رمز_الدور_الثابت", { length: 40 }).primaryKey(),
  nameAr: varchar("اسم_الدور_بالعربية", { length: 100 }).notNull(),
  description: text("وصف_الدور"),
  permissions: json("رموز_الصلاحيات").$type<string[]>().notNull(),
});

export const squareAssignments = mysqlTable("إسناد_المربعات", {
  squareId: int("معرف_المربع").notNull(),
  branchId: int("معرف_الفرع").notNull(),
  employeeId: int("معرف_الموظف_اختياري"),
  isPrimary: boolean("هل_الإسناد_أساسي").default(false).notNull(),
  createdAt: timestamp("تاريخ_الإسناد").defaultNow().notNull(),
}, table => ({
  fk_square_assignment_square: foreignKey({ columns: [table.squareId], foreignColumns: [squares.id], name: "fk_square_assignment_square" }).onDelete("restrict"),
  fk_square_assignment_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_square_assignment_branch" }).onDelete("restrict"),
  fk_square_assignment_employee: foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "fk_square_assignment_employee" }).onDelete("restrict"),
  pk: primaryKey({ columns: [table.squareId, table.branchId] }),
  branchIdx: index("إسناد_المربعات_فهرس_01").on(table.branchId),
  employeeIdx: index("إسناد_المربعات_فهرس_الموظف").on(table.employeeId),
}));

export const prospects = mysqlTable("العملاء_المحتملون", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  name: varchar("اسم_العميل_أو_الجهة", { length: 180 }).notNull(),
  customerType: varchar("نوع_العميل", { length: 80 }).notNull(),
  sector: varchar("القطاع", { length: 120 }).notNull(),
  activity: varchar("طبيعة_النشاط", { length: 160 }),
  phone: varchar("الهاتف", { length: 48 }),
  email: varchar("البريد_الإلكتروني", { length: 320 }),
  address: text("العنوان"),
  squareId: int("معرف_المربع"),
  branchId: int("معرف_الفرع").notNull(),
  employeeId: int("معرف_الموظف_المكلف"),
  firstContactDate: date("تاريخ_أول_تواصل"),
  lastFollowupAt: date("تاريخ_آخر_متابعة"),
  nextFollowupAt: date("موعد_المتابعة_القادمة"),
  products: text("المنتجات_المحتملة"),
  expectedValue: decimal("القيمة_المتوقعة", { precision: 16, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("مرحلة_الاستقطاب", ["جديد", "تم_التواصل", "تمت_الزيارة", "قيد_المتابعة", "قيد_التفاوض", "تم_الاستقطاب", "غير_مهتم", "مؤجل"]).default("جديد").notNull(),
  notes: text("ملاحظات_المتابعة"),
  createdBy: int("معرف_منشئ_السجل"),
  isDemo: boolean("هل_السجل_تجريبي").default(false).notNull(),
  createdAt: timestamp("تاريخ_الإنشاء").defaultNow().notNull(),
  updatedAt: timestamp("آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_prospect_square: foreignKey({ columns: [table.squareId], foreignColumns: [squares.id], name: "fk_prospect_square" }).onDelete("restrict"),
  fk_prospect_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_prospect_branch" }).onDelete("restrict"),
  fk_prospect_employee: foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "fk_prospect_employee" }).onDelete("restrict"),
  fk_prospect_creator: foreignKey({ columns: [table.createdBy], foreignColumns: [users.id], name: "fk_prospect_creator" }).onDelete("restrict"),
  branchIdx: index("العملاء_المحتملون_فهرس_01").on(table.branchId),
  employeeIdx: index("العملاء_المحتملون_فهرس_02").on(table.employeeId),
  statusIdx: index("العملاء_المحتملون_فهرس_03").on(table.status),
  nextFollowupIdx: index("العملاء_المحتملون_فهرس_04").on(table.nextFollowupAt),
  squareIdx: index("العملاء_المحتملون_فهرس_المربع").on(table.squareId),
  creatorIdx: index("العملاء_المحتملون_فهرس_المنشئ").on(table.createdBy),
}));

export const visits = mysqlTable("الزيارات_الميدانية", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  agencyName: varchar("اسم_الجهة", { length: 180 }).notNull(),
  agencyType: varchar("نوع_الجهة", { length: 100 }).notNull(),
  prospectId: int("معرف_العميل_المحتمل_اختياري"),
  squareId: int("معرف_المربع"),
  branchId: int("معرف_الفرع").notNull(),
  employeeId: int("معرف_الموظف"),
  visitAt: timestamp("تاريخ_ووقت_الزيارة").notNull(),
  location: varchar("الموقع", { length: 240 }),
  visitType: varchar("نوع_الزيارة", { length: 100 }).notNull(),
  personMet: varchar("الشخص_الذي_تمت_مقابلته", { length: 160 }),
  result: text("نتيجة_الزيارة"),
  products: text("المنتجات_التي_نوقشت"),
  opportunities: text("الفرص_الناتجة"),
  notes: text("ملاحظات"),
  nextAction: text("الإجراء_التالي"),
  nextFollowupAt: date("تاريخ_المتابعة_القادمة"),
  attachments: json("المرفقات_بصيغة_جيسون").$type<Array<{ name: string; url: string; size: number }>>(),
  createdBy: int("معرف_منشئ_السجل"),
  isDemo: boolean("هل_السجل_تجريبي").default(false).notNull(),
  createdAt: timestamp("تاريخ_تسجيل_الزيارة").defaultNow().notNull(),
}, table => ({
  fk_visit_prospect: foreignKey({ columns: [table.prospectId], foreignColumns: [prospects.id], name: "fk_visit_prospect" }).onDelete("restrict"),
  fk_visit_square: foreignKey({ columns: [table.squareId], foreignColumns: [squares.id], name: "fk_visit_square" }).onDelete("restrict"),
  fk_visit_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_visit_branch" }).onDelete("restrict"),
  fk_visit_employee: foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "fk_visit_employee" }).onDelete("restrict"),
  fk_visit_creator: foreignKey({ columns: [table.createdBy], foreignColumns: [users.id], name: "fk_visit_creator" }).onDelete("restrict"),
  branchIdx: index("الزيارات_الميدانية_فهرس_01").on(table.branchId),
  employeeIdx: index("الزيارات_الميدانية_فهرس_02").on(table.employeeId),
  visitDateIdx: index("الزيارات_الميدانية_فهرس_03").on(table.visitAt),
  prospectIdx: index("الزيارات_الميدانية_فهرس_العميل").on(table.prospectId),
  squareIdx: index("الزيارات_الميدانية_فهرس_المربع").on(table.squareId),
  creatorIdx: index("الزيارات_الميدانية_فهرس_المنشئ").on(table.createdBy),
}));

export const targets = mysqlTable("المستهدفات", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  metricCode: varchar("الرمز_التقني_للمؤشر", { length: 64 }).notNull(),
  metricName: varchar("اسم_المؤشر", { length: 120 }).notNull(),
  interval: mysqlEnum("دورية_المستهدف", ["يومي", "أسبوعي", "شهري", "ربع_سنوي", "سنوي"]).notNull(),
  periodStart: date("بداية_الفترة").notNull(),
  targetValue: decimal("القيمة_المستهدفة", { precision: 16, scale: 2 }).notNull(),
  createdBy: int("معرف_منشئ_السجل"),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({
  fk_target_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_target_branch" }).onDelete("restrict"),
  fk_target_creator: foreignKey({ columns: [table.createdBy], foreignColumns: [users.id], name: "fk_target_creator" }).onDelete("restrict"),
  branchMetricIdx: index("المستهدفات_فهرس_01").on(table.branchId, table.metricCode),
  uniquePeriod: uniqueIndex("المستهدفات_فهرس_02").on(table.branchId, table.metricCode, table.interval, table.periodStart),
  creatorIdx: index("المستهدفات_فهرس_المنشئ").on(table.createdBy),
}));

export const performance = mysqlTable("الأداء_الفعلي", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  periodDate: date("تاريخ_الأداء").notNull(),
  metricCode: varchar("الرمز_التقني_للمؤشر", { length: 64 }).notNull(),
  actualValue: decimal("القيمة_الفعلية", { precision: 16, scale: 2 }).default("0").notNull(),
  previousValue: decimal("قيمة_الفترة_السابقة", { precision: 16, scale: 2 }).default("0").notNull(),
  updatedBy: int("معرف_آخر_من_عدل"),
  updatedAt: timestamp("وقت_آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_performance_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_performance_branch" }).onDelete("restrict"),
  fk_performance_updater: foreignKey({ columns: [table.updatedBy], foreignColumns: [users.id], name: "fk_performance_updater" }).onDelete("restrict"),
  metricIdx: index("الأداء_الفعلي_فهرس_01").on(table.metricCode, table.periodDate),
  branchDateIdx: index("الأداء_الفعلي_فهرس_02").on(table.branchId, table.periodDate),
  uniqueMetricDay: uniqueIndex("الأداء_الفعلي_فهرس_03").on(table.branchId, table.periodDate, table.metricCode),
  updaterIdx: index("الأداء_الفعلي_فهرس_المعدل").on(table.updatedBy),
}));

export const dailyReports = mysqlTable("التقارير_اليومية", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  userId: int("معرف_المستخدم").notNull(),
  reportDate: date("تاريخ_التقرير").notNull(),
  individualAccounts: int("حسابات_الأفراد").default(0).notNull(),
  companyAccounts: int("حسابات_الشركات").default(0).notNull(),
  organizationAccounts: int("حسابات_المنظمات").default(0).notNull(),
  governmentAccounts: int("حسابات_الجهات_الحكومية").default(0).notNull(),
  cacFast: int("عمليات_كاك_فاست").default(0).notNull(),
  cards: int("البطاقات").default(0).notNull(),
  transfers: int("الحوالات").default(0).notNull(),
  digitalServices: int("الخدمات_الرقمية").default(0).notNull(),
  visitsCount: int("عدد_الزيارات").default(0).notNull(),
  meetingsCount: int("عدد_الاجتماعات").default(0).notNull(),
  callsCount: int("عدد_الاتصالات").default(0).notNull(),
  newCustomers: int("العملاء_الجدد").default(0).notNull(),
  newOpportunities: int("الفرص_الجديدة").default(0).notNull(),
  followups: int("المتابعات").default(0).notNull(),
  obstacles: text("المعوقات"),
  needs: text("الاحتياجات"),
  status: mysqlEnum("حالة_التقرير", ["مسودة", "مرسل"]).default("مسودة").notNull(),
  createdAt: timestamp("تاريخ_الإنشاء").defaultNow().notNull(),
  updatedAt: timestamp("آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_daily_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_daily_branch" }).onDelete("restrict"),
  branchDateIdx: index("التقارير_اليومية_فهرس_01").on(table.branchId, table.reportDate),
  userIdx: index("التقارير_اليومية_فهرس_02").on(table.userId),
  uniqueAuthorDate: uniqueIndex("فريد_يومي_مستخدم").on(table.branchId, table.userId, table.reportDate),
}));

export const complaints = mysqlTable("الشكاوى", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  complaintType: varchar("نوع_الشكوى", { length: 120 }).notNull(),
  branchId: int("معرف_الفرع").notNull(),
  complaintDate: date("تاريخ_الشكوى").notNull(),
  ownerName: varchar("المسؤول_عن_المعالجة", { length: 160 }),
  processingDays: int("أيام_المعالجة").default(0).notNull(),
  status: mysqlEnum("حالة_الشكوى", ["مفتوح", "قيد_التنفيذ", "تمت_المعالجة", "مغلق"]).default("مفتوح").notNull(),
  details: text("التفاصيل"),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
  updatedAt: timestamp("آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_complaint_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_complaint_branch" }).onDelete("restrict"),
  branchDateIdx: index("الشكاوى_فهرس_01").on(table.branchId, table.complaintDate),
  statusIdx: index("الشكاوى_فهرس_02").on(table.status),
}));

export const qualityReviews = mysqlTable("تقييمات_الجودة", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  reviewDate: date("تاريخ_التقييم").notNull(),
  reception: int("تقييم_الاستقبال").notNull(),
  speed: int("تقييم_سرعة_الخدمة").notNull(),
  accuracy: int("تقييم_دقة_المعاملة").notNull(),
  customerExperience: int("تقييم_تجربة_العميل").notNull(),
  procedures: int("الالتزام_بالإجراءات").notNull(),
  forms: int("الالتزام_بالنماذج").notNull(),
  kyc: int("الالتزام_بمتطلبات_اعرف_عميلك").notNull(),
  instructions: int("الالتزام_بالتعليمات").notNull(),
  reviewer: varchar("اسم_المقيم", { length: 160 }),
  notes: text("ملاحظات_التقييم"),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({
  fk_quality_review_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_quality_review_branch" }).onDelete("restrict"), branchDateIdx: index("تقييمات_الجودة_فهرس_01").on(table.branchId, table.reviewDate) }));

export const qualityFindings = mysqlTable("ملاحظات_الجودة", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  finding: text("نص_الملاحظة").notNull(),
  severity: mysqlEnum("درجة_الأهمية", ["منخفض", "متوسط", "مرتفع", "حرج"]).default("متوسط").notNull(),
  ownerName: varchar("المسؤول", { length: 160 }),
  dueDate: date("تاريخ_الاستحقاق"),
  status: mysqlEnum("حالة_المعالجة", ["مفتوح", "قيد_التنفيذ", "تمت_المعالجة", "مغلق"]).default("مفتوح").notNull(),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({
  fk_quality_finding_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_quality_finding_branch" }).onDelete("restrict"), branchIdx: index("ملاحظات_الجودة_فهرس_01").on(table.branchId), dueIdx: index("ملاحظات_الجودة_فهرس_02").on(table.dueDate) }));

export const correctiveActions = mysqlTable("الإجراءات_التصحيحية", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  action: text("وصف_الإجراء_التصحيحي").notNull(),
  ownerName: varchar("المسؤول", { length: 160 }),
  executionDate: date("موعد_التنفيذ"),
  progress: int("نسبة_الإنجاز").default(0).notNull(),
  status: mysqlEnum("حالة_الإجراء", ["مفتوح", "قيد_التنفيذ", "مغلق"]).default("مفتوح").notNull(),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({
  fk_corrective_action_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_corrective_action_branch" }).onDelete("restrict"), branchIdx: index("الإجراءات_التصحيحية_فهرس_01").on(table.branchId) }));

export const notifications = mysqlTable("التنبيهات", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  userId: int("معرف_المستخدم_اختياري"),
  branchId: int("معرف_الفرع_اختياري"),
  type: mysqlEnum("نوع_التنبيه", ["خطر", "نجاح", "تذكير", "معلومات", "تحذير"]).notNull(),
  title: varchar("عنوان_التنبيه", { length: 180 }).notNull(),
  body: text("نص_التنبيه").notNull(),
  isRead: boolean("هل_تمت_القراءة").default(false).notNull(),
  alertKey: varchar("مفتاح_التنبيه", { length: 255 }),
  alertStatus: mysqlEnum("حالة_التنبيه", ["نشط", "تمت_المراجعة", "مؤجل", "محلول", "انتهى"]).default("نشط").notNull(),
  acknowledgedAt: timestamp("وقت_الإقرار"),
  acknowledgedBy: int("معرف_المقر_اختياري"),
  snoozedUntil: timestamp("موعد_استئناف_التنبيه"),
  resolvedAt: timestamp("وقت_الحل"),
  lastSeenAt: timestamp("آخر_ظهور_للتنبيه"),
  createdAt: timestamp("وقت_الإنشاء").defaultNow().notNull(),
}, table => ({
  fk_notification_user: foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "fk_notification_user" }).onDelete("restrict"),
  fk_notification_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_notification_branch" }).onDelete("restrict"),
  fk_notification_acknowledger: foreignKey({ columns: [table.acknowledgedBy], foreignColumns: [users.id], name: "fk_notification_acknowledger" }).onDelete("restrict"),
  userReadIdx: index("التنبيهات_فهرس_01").on(table.userId, table.isRead),
  branchIdx: index("التنبيهات_فهرس_02").on(table.branchId),
  acknowledgerIdx: index("التنبيهات_فهرس_المقر").on(table.acknowledgedBy),
  alertKeyUnique: uniqueIndex("التنبيهات_فريد_المفتاح").on(table.alertKey),
  alertStatusIdx: index("التنبيهات_فهرس_الحالة").on(table.userId, table.alertStatus, table.createdAt),
}));

export const aiInsights = mysqlTable("تحليلات_الذكاء_الاصطناعي", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  generatedBy: int("معرف_منشئ_التحليل").notNull(),
  periodLabel: varchar("الفترة_التحليلية", { length: 80 }).notNull(),
  headline: varchar("عنوان_التحليل", { length: 240 }).notNull(),
  content: text("نص_التحليل").notNull(),
  recommendations: json("التوصيات_بصيغة_جيسون").$type<string[]>().notNull(),
  sourceSummary: json("ملخص_المصادر_بصيغة_جيسون").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("وقت_الإنشاء").defaultNow().notNull(),
}, table => ({
  fk_ai_creator: foreignKey({ columns: [table.generatedBy], foreignColumns: [users.id], name: "fk_ai_creator" }).onDelete("restrict"),
  creatorIdx: index("تحليلات_الذكاء_فهرس_المنشئ").on(table.generatedBy),
}));

export const branchScoreWeights = mysqlTable("أوزان_تقييم_الفروع", {
  metricCode: varchar("رمز_المؤشر", { length: 64 }).primaryKey(),
  metricName: varchar("اسم_المؤشر", { length: 120 }).notNull(),
  weightPercent: int("وزن_المؤشر_كنسبة_مئوية").notNull(),
  updatedBy: int("معرف_آخر_من_عدل"),
  updatedAt: timestamp("وقت_آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_score_weight_updater: foreignKey({ columns: [table.updatedBy], foreignColumns: [users.id], name: "fk_score_weight_updater" }).onDelete("restrict"),
  updaterIdx: index("أوزان_التقييم_فهرس_المعدل").on(table.updatedBy),
}));

export const auditLogs = mysqlTable("سجل_التدقيق", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  actorUserId: int("معرف_المستخدم_المنفذ").notNull(),
  action: mysqlEnum("نوع_العملية", ["إنشاء", "تعديل", "حذف", "تغيير_الدور", "تسجيل_الدخول"]).notNull(),
  entity: varchar("نوع_السجل_المتأثر", { length: 96 }).notNull(),
  entityId: varchar("معرف_السجل_المتأثر", { length: 96 }),
  previousValue: json("القيم_السابقة_بصيغة_جيسون").$type<Record<string, unknown>>(),
  newValue: json("القيم_الجديدة_بصيغة_جيسون").$type<Record<string, unknown>>(),
  createdAt: timestamp("وقت_العملية").defaultNow().notNull(),
}, table => ({
  fk_audit_actor: foreignKey({ columns: [table.actorUserId], foreignColumns: [users.id], name: "fk_audit_actor" }).onDelete("restrict"),
  actorIdx: index("سجل_التدقيق_فهرس_01").on(table.actorUserId),
  entityIdx: index("سجل_التدقيق_فهرس_02").on(table.entity, table.entityId),
  dateIdx: index("سجل_التدقيق_فهرس_03").on(table.createdAt),
}));

export const appSettings = mysqlTable("إعدادات_التطبيق", {
  settingKey: varchar("مفتاح_الإعداد", { length: 80 }).primaryKey(),
  settingValue: json("قيمة_الإعداد_بصيغة_جيسون").$type<unknown>().notNull(),
  updatedBy: int("معرف_آخر_من_عدل"),
  updatedAt: timestamp("وقت_آخر_تحديث").defaultNow().onUpdateNow().notNull(),
}, table => ({
  fk_setting_updater: foreignKey({ columns: [table.updatedBy], foreignColumns: [users.id], name: "fk_setting_updater" }).onDelete("restrict"),
  updaterIdx: index("إعدادات_التطبيق_فهرس_المعدل").on(table.updatedBy),
}));

export const reports = mysqlTable("التقارير_المحفوظة", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  reportType: varchar("نوع_التقرير", { length: 64 }).notNull(),
  title: varchar("عنوان_التقرير", { length: 200 }).notNull(),
  branchId: int("معرف_الفرع_اختياري"),
  periodStart: date("بداية_الفترة").notNull(),
  periodEnd: date("نهاية_الفترة").notNull(),
  reportData: json("بيانات_التقرير_المجمعة_بصيغة_جيسون").$type<Record<string, unknown>>().notNull(),
  createdBy: int("معرف_منشئ_التقرير").notNull(),
  createdAt: timestamp("وقت_الإنشاء").defaultNow().notNull(),
}, table => ({
  fk_report_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_report_branch" }).onDelete("restrict"),
  fk_report_creator: foreignKey({ columns: [table.createdBy], foreignColumns: [users.id], name: "fk_report_creator" }).onDelete("restrict"),
  typeIdx: index("التقارير_المحفوظة_فهرس_01").on(table.reportType),
  dateIdx: index("التقارير_المحفوظة_فهرس_02").on(table.periodStart, table.periodEnd),
  branchIdx: index("التقارير_المحفوظة_فهرس_03").on(table.branchId),
  creatorIdx: index("التقارير_المحفوظة_فهرس_المنشئ").on(table.createdBy),
}));
