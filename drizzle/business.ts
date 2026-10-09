import {
  boolean,
  date,
  decimal,
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

export const branches = mysqlTable("الفروع", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  code: varchar("رمز_الفرع", { length: 32 }).notNull().unique("الفروع_فريد_رمز_الفرع"),
  nameAr: varchar("اسم_الفرع_بالعربية", { length: 160 }).notNull(),
  nameEn: varchar("اسم_الفرع_بالإنجليزية", { length: 160 }).notNull(),
  managerName: varchar("اسم_المدير", { length: 160 }),
  parentBranchCode: varchar("رمز_الفرع_الأم", { length: 32 }),
  branchType: mysqlEnum("نوع_الفرع", ["فرع", "مكتب_فرعي", "إسلامي"]).default("فرع").notNull(),
  status: mysqlEnum("الحالة_التشغيلية", ["نشط", "غير_نشط"]).default("نشط").notNull(),
  headcount: int("عدد_الموظفين").default(0).notNull(),
  createdAt: timestamp("تاريخ_الإنشاء").defaultNow().notNull(),
  updatedAt: timestamp("آخر_تحديث").defaultNow().onUpdateNow().notNull(),
});

export const roles = mysqlTable("الأدوار", {
  roleKey: varchar("رمز_الدور_الثابت", { length: 40 }).primaryKey(),
  nameAr: varchar("اسم_الدور_بالعربية", { length: 100 }).notNull(),
  description: text("وصف_الدور"),
  permissions: json("رموز_الصلاحيات").$type<string[]>().notNull(),
});

export const employees = mysqlTable("الموظفون", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  employeeCode: varchar("الرقم_الوظيفي", { length: 32 }).notNull().unique("الموظفون_فريد_الرقم_الوظيفي"),
  name: varchar("اسم_الموظف", { length: 160 }).notNull(),
  title: varchar("المسمى_الوظيفي", { length: 120 }).notNull(),
  branchId: int("معرف_الفرع").notNull(),
  status: mysqlEnum("حالة_الموظف", ["نشط", "غير_نشط"]).default("نشط").notNull(),
  isDemo: boolean("هل_السجل_تجريبي").default(true).notNull(),
  createdAt: timestamp("تاريخ_إضافة_السجل").defaultNow().notNull(),
}, table => ({ branchIdx: index("الموظفون_فهرس_01").on(table.branchId) }));

export const squares = mysqlTable("المربعات_الجغرافية", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  squareNumber: int("رقم_المربع").notNull().unique("المربعات_الجغرافية_فريد_رقم_المربع"),
  name: varchar("اسم_المربع", { length: 120 }).notNull(),
  region: varchar("المنطقة", { length: 120 }).notNull(),
  polygon: json("نقاط_حدود_المربع_التقريبية_بصيغة_جيسون").$type<Array<[number, number]>>().notNull(),
  entitiesCount: int("عدد_الجهات").default(0).notNull(),
  companiesCount: int("عدد_الشركات").default(0).notNull(),
  organizationsCount: int("عدد_المنظمات").default(0).notNull(),
  merchantsCount: int("عدد_التجار").default(0).notNull(),
  targetValue: int("القيمة_المستهدفة").default(0).notNull(),
  createdAt: timestamp("تاريخ_الإنشاء").defaultNow().notNull(),
  updatedAt: timestamp("آخر_تحديث").defaultNow().onUpdateNow().notNull(),
});

export const squareAssignments = mysqlTable("إسناد_المربعات", {
  squareId: int("معرف_المربع").notNull(),
  branchId: int("معرف_الفرع").notNull(),
  employeeId: int("معرف_الموظف_اختياري"),
  isPrimary: boolean("هل_الإسناد_أساسي").default(false).notNull(),
  createdAt: timestamp("تاريخ_الإسناد").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.squareId, table.branchId] }),
  branchIdx: index("إسناد_المربعات_فهرس_01").on(table.branchId),
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
  branchIdx: index("العملاء_المحتملون_فهرس_01").on(table.branchId),
  employeeIdx: index("العملاء_المحتملون_فهرس_02").on(table.employeeId),
  statusIdx: index("العملاء_المحتملون_فهرس_03").on(table.status),
  nextFollowupIdx: index("العملاء_المحتملون_فهرس_04").on(table.nextFollowupAt),
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
  branchIdx: index("الزيارات_الميدانية_فهرس_01").on(table.branchId),
  employeeIdx: index("الزيارات_الميدانية_فهرس_02").on(table.employeeId),
  visitDateIdx: index("الزيارات_الميدانية_فهرس_03").on(table.visitAt),
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
  branchMetricIdx: index("المستهدفات_فهرس_01").on(table.branchId, table.metricCode),
  uniquePeriod: uniqueIndex("المستهدفات_فهرس_02").on(table.branchId, table.metricCode, table.interval, table.periodStart),
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
  metricIdx: index("الأداء_الفعلي_فهرس_01").on(table.metricCode, table.periodDate),
  branchDateIdx: index("الأداء_الفعلي_فهرس_02").on(table.branchId, table.periodDate),
  uniqueMetricDay: uniqueIndex("الأداء_الفعلي_فهرس_03").on(table.branchId, table.periodDate, table.metricCode),
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
  branchDateIdx: index("التقارير_اليومية_فهرس_01").on(table.branchId, table.reportDate),
  userIdx: index("التقارير_اليومية_فهرس_02").on(table.userId),
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
}, table => ({ branchDateIdx: index("تقييمات_الجودة_فهرس_01").on(table.branchId, table.reviewDate) }));

export const qualityFindings = mysqlTable("ملاحظات_الجودة", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  finding: text("نص_الملاحظة").notNull(),
  severity: mysqlEnum("درجة_الأهمية", ["منخفض", "متوسط", "مرتفع", "حرج"]).default("متوسط").notNull(),
  ownerName: varchar("المسؤول", { length: 160 }),
  dueDate: date("تاريخ_الاستحقاق"),
  status: mysqlEnum("حالة_المعالجة", ["مفتوح", "قيد_التنفيذ", "تمت_المعالجة", "مغلق"]).default("مفتوح").notNull(),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({ branchIdx: index("ملاحظات_الجودة_فهرس_01").on(table.branchId), dueIdx: index("ملاحظات_الجودة_فهرس_02").on(table.dueDate) }));

export const correctiveActions = mysqlTable("الإجراءات_التصحيحية", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  branchId: int("معرف_الفرع").notNull(),
  action: text("وصف_الإجراء_التصحيحي").notNull(),
  ownerName: varchar("المسؤول", { length: 160 }),
  executionDate: date("موعد_التنفيذ"),
  progress: int("نسبة_الإنجاز").default(0).notNull(),
  status: mysqlEnum("حالة_الإجراء", ["مفتوح", "قيد_التنفيذ", "مغلق"]).default("مفتوح").notNull(),
  createdAt: timestamp("تاريخ_الإضافة").defaultNow().notNull(),
}, table => ({ branchIdx: index("الإجراءات_التصحيحية_فهرس_01").on(table.branchId) }));

export const notifications = mysqlTable("التنبيهات", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  userId: int("معرف_المستخدم_اختياري"),
  branchId: int("معرف_الفرع_اختياري"),
  type: mysqlEnum("نوع_التنبيه", ["خطر", "نجاح", "تذكير", "معلومات", "تحذير"]).notNull(),
  title: varchar("عنوان_التنبيه", { length: 180 }).notNull(),
  body: text("نص_التنبيه").notNull(),
  isRead: boolean("هل_تمت_القراءة").default(false).notNull(),
  createdAt: timestamp("وقت_الإنشاء").defaultNow().notNull(),
}, table => ({
  userReadIdx: index("التنبيهات_فهرس_01").on(table.userId, table.isRead),
  branchIdx: index("التنبيهات_فهرس_02").on(table.branchId),
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
});

export const branchScoreWeights = mysqlTable("أوزان_تقييم_الفروع", {
  metricCode: varchar("رمز_المؤشر", { length: 64 }).primaryKey(),
  metricName: varchar("اسم_المؤشر", { length: 120 }).notNull(),
  weightPercent: int("وزن_المؤشر_كنسبة_مئوية").notNull(),
  updatedBy: int("معرف_آخر_من_عدل"),
  updatedAt: timestamp("وقت_آخر_تحديث").defaultNow().onUpdateNow().notNull(),
});

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
  actorIdx: index("سجل_التدقيق_فهرس_01").on(table.actorUserId),
  entityIdx: index("سجل_التدقيق_فهرس_02").on(table.entity, table.entityId),
  dateIdx: index("سجل_التدقيق_فهرس_03").on(table.createdAt),
}));

export const appSettings = mysqlTable("إعدادات_التطبيق", {
  settingKey: varchar("مفتاح_الإعداد", { length: 80 }).primaryKey(),
  settingValue: json("قيمة_الإعداد_بصيغة_جيسون").$type<unknown>().notNull(),
  updatedBy: int("معرف_آخر_من_عدل"),
  updatedAt: timestamp("وقت_آخر_تحديث").defaultNow().onUpdateNow().notNull(),
});

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
  typeIdx: index("التقارير_المحفوظة_فهرس_01").on(table.reportType),
  dateIdx: index("التقارير_المحفوظة_فهرس_02").on(table.periodStart, table.periodEnd),
  branchIdx: index("التقارير_المحفوظة_فهرس_03").on(table.branchId),
}));
