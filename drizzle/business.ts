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

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 160 }).notNull(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  managerName: varchar("managerName", { length: 160 }),
  parentBranchCode: varchar("parentBranchCode", { length: 32 }),
  branchType: mysqlEnum("branchType", ["branch", "suboffice", "islamic"]).default("branch").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  headcount: int("headcount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const roles = mysqlTable("roles", {
  roleKey: varchar("roleKey", { length: 40 }).primaryKey(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull(),
});

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeCode: varchar("employeeCode", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  branchId: int("branchId").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  isDemo: boolean("isDemo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ branchIdx: index("employees_branch_idx").on(table.branchId) }));

export const squares = mysqlTable("squares", {
  id: int("id").autoincrement().primaryKey(),
  squareNumber: int("squareNumber").notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  polygon: json("polygon").$type<Array<[number, number]>>().notNull(),
  entitiesCount: int("entitiesCount").default(0).notNull(),
  companiesCount: int("companiesCount").default(0).notNull(),
  organizationsCount: int("organizationsCount").default(0).notNull(),
  merchantsCount: int("merchantsCount").default(0).notNull(),
  targetValue: int("targetValue").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const squareAssignments = mysqlTable("squareAssignments", {
  squareId: int("squareId").notNull(),
  branchId: int("branchId").notNull(),
  employeeId: int("employeeId"),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.squareId, table.branchId] }),
  branchIdx: index("square_assignment_branch_idx").on(table.branchId),
}));

export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  customerType: varchar("customerType", { length: 80 }).notNull(),
  sector: varchar("sector", { length: 120 }).notNull(),
  activity: varchar("activity", { length: 160 }),
  phone: varchar("phone", { length: 48 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  squareId: int("squareId"),
  branchId: int("branchId").notNull(),
  employeeId: int("employeeId"),
  firstContactDate: date("firstContactDate"),
  lastFollowupAt: date("lastFollowupAt"),
  nextFollowupAt: date("nextFollowupAt"),
  products: text("products"),
  expectedValue: decimal("expectedValue", { precision: 16, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "visited", "following_up", "negotiation", "converted", "not_interested", "deferred"]).default("new").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  branchIdx: index("prospects_branch_idx").on(table.branchId),
  employeeIdx: index("prospects_employee_idx").on(table.employeeId),
  statusIdx: index("prospects_status_idx").on(table.status),
  nextFollowupIdx: index("prospects_followup_idx").on(table.nextFollowupAt),
}));

export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  agencyName: varchar("agencyName", { length: 180 }).notNull(),
  agencyType: varchar("agencyType", { length: 100 }).notNull(),
  prospectId: int("prospectId"),
  squareId: int("squareId"),
  branchId: int("branchId").notNull(),
  employeeId: int("employeeId"),
  visitAt: timestamp("visitAt").notNull(),
  location: varchar("location", { length: 240 }),
  visitType: varchar("visitType", { length: 100 }).notNull(),
  personMet: varchar("personMet", { length: 160 }),
  result: text("result"),
  products: text("products"),
  opportunities: text("opportunities"),
  notes: text("notes"),
  nextAction: text("nextAction"),
  nextFollowupAt: date("nextFollowupAt"),
  attachments: json("attachments").$type<Array<{ name: string; url: string; size: number }>>(),
  createdBy: int("createdBy"),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  branchIdx: index("visits_branch_idx").on(table.branchId),
  employeeIdx: index("visits_employee_idx").on(table.employeeId),
  visitDateIdx: index("visits_date_idx").on(table.visitAt),
}));

export const targets = mysqlTable("targets", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  metricCode: varchar("metricCode", { length: 64 }).notNull(),
  metricName: varchar("metricName", { length: 120 }).notNull(),
  interval: mysqlEnum("interval", ["daily", "weekly", "monthly", "quarterly", "yearly"]).notNull(),
  periodStart: date("periodStart").notNull(),
  targetValue: decimal("targetValue", { precision: 16, scale: 2 }).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  branchMetricIdx: index("targets_branch_metric_idx").on(table.branchId, table.metricCode),
  uniquePeriod: uniqueIndex("targets_period_uq").on(table.branchId, table.metricCode, table.interval, table.periodStart),
}));

export const performance = mysqlTable("performance", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  periodDate: date("periodDate").notNull(),
  metricCode: varchar("metricCode", { length: 64 }).notNull(),
  actualValue: decimal("actualValue", { precision: 16, scale: 2 }).default("0").notNull(),
  previousValue: decimal("previousValue", { precision: 16, scale: 2 }).default("0").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  metricIdx: index("performance_metric_idx").on(table.metricCode, table.periodDate),
  branchDateIdx: index("performance_branch_date_idx").on(table.branchId, table.periodDate),
  uniqueMetricDay: uniqueIndex("performance_metric_day_uq").on(table.branchId, table.periodDate, table.metricCode),
}));

export const dailyReports = mysqlTable("dailyReports", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  userId: int("userId").notNull(),
  reportDate: date("reportDate").notNull(),
  individualAccounts: int("individualAccounts").default(0).notNull(),
  companyAccounts: int("companyAccounts").default(0).notNull(),
  organizationAccounts: int("organizationAccounts").default(0).notNull(),
  governmentAccounts: int("governmentAccounts").default(0).notNull(),
  cacFast: int("cacFast").default(0).notNull(),
  cards: int("cards").default(0).notNull(),
  transfers: int("transfers").default(0).notNull(),
  digitalServices: int("digitalServices").default(0).notNull(),
  visitsCount: int("visitsCount").default(0).notNull(),
  meetingsCount: int("meetingsCount").default(0).notNull(),
  callsCount: int("callsCount").default(0).notNull(),
  newCustomers: int("newCustomers").default(0).notNull(),
  newOpportunities: int("newOpportunities").default(0).notNull(),
  followups: int("followups").default(0).notNull(),
  obstacles: text("obstacles"),
  needs: text("needs"),
  status: mysqlEnum("status", ["draft", "submitted"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  branchDateIdx: index("daily_reports_branch_date_idx").on(table.branchId, table.reportDate),
  userIdx: index("daily_reports_user_idx").on(table.userId),
}));

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  complaintType: varchar("complaintType", { length: 120 }).notNull(),
  branchId: int("branchId").notNull(),
  complaintDate: date("complaintDate").notNull(),
  ownerName: varchar("ownerName", { length: 160 }),
  processingDays: int("processingDays").default(0).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  branchDateIdx: index("complaints_branch_date_idx").on(table.branchId, table.complaintDate),
  statusIdx: index("complaints_status_idx").on(table.status),
}));

export const qualityReviews = mysqlTable("qualityReviews", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  reviewDate: date("reviewDate").notNull(),
  reception: int("reception").notNull(),
  speed: int("speed").notNull(),
  accuracy: int("accuracy").notNull(),
  customerExperience: int("customerExperience").notNull(),
  procedures: int("procedures").notNull(),
  forms: int("forms").notNull(),
  kyc: int("kyc").notNull(),
  instructions: int("instructions").notNull(),
  reviewer: varchar("reviewer", { length: 160 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ branchDateIdx: index("quality_review_branch_date_idx").on(table.branchId, table.reviewDate) }));

export const qualityFindings = mysqlTable("qualityFindings", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  finding: text("finding").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  ownerName: varchar("ownerName", { length: 160 }),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ branchIdx: index("quality_findings_branch_idx").on(table.branchId), dueIdx: index("quality_findings_due_idx").on(table.dueDate) }));

export const correctiveActions = mysqlTable("correctiveActions", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  action: text("action").notNull(),
  ownerName: varchar("ownerName", { length: 160 }),
  executionDate: date("executionDate"),
  progress: int("progress").default(0).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ branchIdx: index("corrective_actions_branch_idx").on(table.branchId) }));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  branchId: int("branchId"),
  type: mysqlEnum("type", ["danger", "success", "reminder", "info", "warning"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userReadIdx: index("notifications_user_read_idx").on(table.userId, table.isRead),
  branchIdx: index("notifications_branch_idx").on(table.branchId),
}));

export const aiInsights = mysqlTable("aiInsights", {
  id: int("id").autoincrement().primaryKey(),
  generatedBy: int("generatedBy").notNull(),
  periodLabel: varchar("periodLabel", { length: 80 }).notNull(),
  headline: varchar("headline", { length: 240 }).notNull(),
  content: text("content").notNull(),
  recommendations: json("recommendations").$type<string[]>().notNull(),
  sourceSummary: json("sourceSummary").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const branchScoreWeights = mysqlTable("branchScoreWeights", {
  metricCode: varchar("metricCode", { length: 64 }).primaryKey(),
  metricName: varchar("metricName", { length: 120 }).notNull(),
  weightPercent: int("weightPercent").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "role_change", "login"]).notNull(),
  entity: varchar("entity", { length: 96 }).notNull(),
  entityId: varchar("entityId", { length: 96 }),
  previousValue: json("previousValue").$type<Record<string, unknown>>(),
  newValue: json("newValue").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  actorIdx: index("audit_actor_idx").on(table.actorUserId),
  entityIdx: index("audit_entity_idx").on(table.entity, table.entityId),
  dateIdx: index("audit_created_idx").on(table.createdAt),
}));

export const appSettings = mysqlTable("appSettings", {
  settingKey: varchar("settingKey", { length: 80 }).primaryKey(),
  settingValue: json("settingValue").$type<unknown>().notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reportType: varchar("reportType", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  branchId: int("branchId"),
  periodStart: date("periodStart").notNull(),
  periodEnd: date("periodEnd").notNull(),
  reportData: json("reportData").$type<Record<string, unknown>>().notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  typeIdx: index("reports_type_idx").on(table.reportType),
  dateIdx: index("reports_period_idx").on(table.periodStart, table.periodEnd),
  branchIdx: index("reports_branch_idx").on(table.branchId),
}));
