import { boolean, foreignKey, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const employees = mysqlTable("الموظفون", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  employeeCode: varchar("الرقم_الوظيفي", { length: 32 }).notNull().unique("الموظفون_فريد_الرقم_الوظيفي"),
  name: varchar("اسم_الموظف", { length: 160 }).notNull(),
  title: varchar("المسمى_الوظيفي", { length: 120 }).notNull(),
  branchId: int("معرف_الفرع").notNull(),
  status: mysqlEnum("حالة_الموظف", ["نشط", "غير_نشط"]).default("نشط").notNull(),
  isDemo: boolean("هل_السجل_تجريبي").default(true).notNull(),
  createdAt: timestamp("تاريخ_إضافة_السجل").defaultNow().notNull(),
}, table => ({
  fk_employees_branch: foreignKey({ columns: [table.branchId], foreignColumns: [branches.id], name: "fk_employees_branch" }).onDelete("restrict"), branchIdx: index("الموظفون_فهرس_01").on(table.branchId) }));

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

export const users = mysqlTable("المستخدمون", {
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  openId: varchar("معرف_الدخول_لدى_مانوس", { length: 64 }).notNull().unique("المستخدمون_فريد_معرف_الدخول_لدى_مانوس"),
  name: text("اسم_المستخدم"),
  email: varchar("البريد_الإلكتروني", { length: 320 }),
  loginMethod: varchar("طريقة_تسجيل_الدخول", { length: 64 }),
  role: mysqlEnum("الدور_التقني", ["مستخدم", "مدير"]).default("مستخدم").notNull(),
  appRole: mysqlEnum("الدور_داخل_التطبيق", ["مدير_النظام", "الإدارة_العليا", "تطوير_الأعمال", "توكيد_الجودة", "مدير_الفرع", "موظف_الفرع"]).default("موظف_الفرع").notNull(),
  assignedBranchId: int("معرف_الفرع_المسند"),
  employeeId: int("معرف_الموظف"),
  isActive: int("حالة_تفعيل_الحساب").default(1).notNull(),
  createdAt: timestamp("تاريخ_إنشاء_الحساب").defaultNow().notNull(),
  updatedAt: timestamp("تاريخ_آخر_تعديل").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("آخر_تسجيل_دخول").defaultNow().notNull(),
}, table => ({
  fk_users_branch: foreignKey({ columns: [table.assignedBranchId], foreignColumns: [branches.id], name: "fk_users_branch" }).onDelete("restrict"),
  fk_users_employee: foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "fk_users_employee" }).onDelete("restrict"),
  branchIdx: index("المستخدمون_فهرس_الفرع").on(table.assignedBranchId),
  employeeIdx: index("المستخدمون_فهرس_الموظف").on(table.employeeId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
