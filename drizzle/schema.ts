import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("المستخدمون", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("المعرف_الداخلي").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

export * from "./business";
