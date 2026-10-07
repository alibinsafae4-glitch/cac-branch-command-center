CREATE TABLE `aiInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`generatedBy` int NOT NULL,
	`periodLabel` varchar(80) NOT NULL,
	`headline` varchar(240) NOT NULL,
	`content` text NOT NULL,
	`recommendations` json NOT NULL,
	`sourceSummary` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiInsights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appSettings` (
	`settingKey` varchar(80) NOT NULL,
	`settingValue` json NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appSettings_settingKey` PRIMARY KEY(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('create','update','delete','role_change','login') NOT NULL,
	`entity` varchar(96) NOT NULL,
	`entityId` varchar(96),
	`previousValue` json,
	`newValue` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchScoreWeights` (
	`metricCode` varchar(64) NOT NULL,
	`metricName` varchar(120) NOT NULL,
	`weightPercent` int NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchScoreWeights_metricCode` PRIMARY KEY(`metricCode`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`nameAr` varchar(160) NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`managerName` varchar(160),
	`parentBranchCode` varchar(32),
	`branchType` enum('branch','suboffice','islamic') NOT NULL DEFAULT 'branch',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`headcount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintType` varchar(120) NOT NULL,
	`branchId` int NOT NULL,
	`complaintDate` date NOT NULL,
	`ownerName` varchar(160),
	`processingDays` int NOT NULL DEFAULT 0,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `correctiveActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`action` text NOT NULL,
	`ownerName` varchar(160),
	`executionDate` date,
	`progress` int NOT NULL DEFAULT 0,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `correctiveActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`userId` int NOT NULL,
	`reportDate` date NOT NULL,
	`individualAccounts` int NOT NULL DEFAULT 0,
	`companyAccounts` int NOT NULL DEFAULT 0,
	`organizationAccounts` int NOT NULL DEFAULT 0,
	`governmentAccounts` int NOT NULL DEFAULT 0,
	`cacFast` int NOT NULL DEFAULT 0,
	`cards` int NOT NULL DEFAULT 0,
	`transfers` int NOT NULL DEFAULT 0,
	`digitalServices` int NOT NULL DEFAULT 0,
	`visitsCount` int NOT NULL DEFAULT 0,
	`meetingsCount` int NOT NULL DEFAULT 0,
	`callsCount` int NOT NULL DEFAULT 0,
	`newCustomers` int NOT NULL DEFAULT 0,
	`newOpportunities` int NOT NULL DEFAULT 0,
	`followups` int NOT NULL DEFAULT 0,
	`obstacles` text,
	`needs` text,
	`status` enum('draft','submitted') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeCode` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`title` varchar(120) NOT NULL,
	`branchId` int NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`isDemo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employeeCode_unique` UNIQUE(`employeeCode`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`branchId` int,
	`type` enum('danger','success','reminder','info','warning') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`periodDate` date NOT NULL,
	`metricCode` varchar(64) NOT NULL,
	`actualValue` decimal(16,2) NOT NULL DEFAULT '0',
	`previousValue` decimal(16,2) NOT NULL DEFAULT '0',
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_id` PRIMARY KEY(`id`),
	CONSTRAINT `performance_metric_day_uq` UNIQUE(`branchId`,`periodDate`,`metricCode`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`customerType` varchar(80) NOT NULL,
	`sector` varchar(120) NOT NULL,
	`activity` varchar(160),
	`phone` varchar(48),
	`email` varchar(320),
	`address` text,
	`squareId` int,
	`branchId` int NOT NULL,
	`employeeId` int,
	`firstContactDate` date,
	`lastFollowupAt` date,
	`nextFollowupAt` date,
	`products` text,
	`expectedValue` decimal(16,2) NOT NULL DEFAULT '0',
	`status` enum('new','contacted','visited','following_up','negotiation','converted','not_interested','deferred') NOT NULL DEFAULT 'new',
	`notes` text,
	`createdBy` int,
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityFindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`finding` text NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`ownerName` varchar(160),
	`dueDate` date,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualityFindings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`reviewDate` date NOT NULL,
	`reception` int NOT NULL,
	`speed` int NOT NULL,
	`accuracy` int NOT NULL,
	`customerExperience` int NOT NULL,
	`procedures` int NOT NULL,
	`forms` int NOT NULL,
	`kyc` int NOT NULL,
	`instructions` int NOT NULL,
	`reviewer` varchar(160),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualityReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportType` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`branchId` int,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`reportData` json NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`roleKey` varchar(40) NOT NULL,
	`nameAr` varchar(100) NOT NULL,
	`description` text,
	`permissions` json NOT NULL,
	CONSTRAINT `roles_roleKey` PRIMARY KEY(`roleKey`)
);
--> statement-breakpoint
CREATE TABLE `squareAssignments` (
	`squareId` int NOT NULL,
	`branchId` int NOT NULL,
	`employeeId` int,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `squareAssignments_squareId_branchId_pk` PRIMARY KEY(`squareId`,`branchId`)
);
--> statement-breakpoint
CREATE TABLE `squares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`squareNumber` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`region` varchar(120) NOT NULL,
	`polygon` json NOT NULL,
	`entitiesCount` int NOT NULL DEFAULT 0,
	`companiesCount` int NOT NULL DEFAULT 0,
	`organizationsCount` int NOT NULL DEFAULT 0,
	`merchantsCount` int NOT NULL DEFAULT 0,
	`targetValue` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `squares_id` PRIMARY KEY(`id`),
	CONSTRAINT `squares_squareNumber_unique` UNIQUE(`squareNumber`)
);
--> statement-breakpoint
CREATE TABLE `targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`metricCode` varchar(64) NOT NULL,
	`metricName` varchar(120) NOT NULL,
	`interval` enum('daily','weekly','monthly','quarterly','yearly') NOT NULL,
	`periodStart` date NOT NULL,
	`targetValue` decimal(16,2) NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `targets_period_uq` UNIQUE(`branchId`,`metricCode`,`interval`,`periodStart`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyName` varchar(180) NOT NULL,
	`agencyType` varchar(100) NOT NULL,
	`prospectId` int,
	`squareId` int,
	`branchId` int NOT NULL,
	`employeeId` int,
	`visitAt` timestamp NOT NULL,
	`location` varchar(240),
	`visitType` varchar(100) NOT NULL,
	`personMet` varchar(160),
	`result` text,
	`products` text,
	`opportunities` text,
	`notes` text,
	`nextAction` text,
	`nextFollowupAt` date,
	`attachments` json,
	`createdBy` int,
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `appRole` enum('super_admin','executive','business_development','quality','branch_manager','branch_employee') DEFAULT 'branch_employee' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `assignedBranchId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `employeeId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `auditLogs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `auditLogs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `complaints_branch_date_idx` ON `complaints` (`branchId`,`complaintDate`);--> statement-breakpoint
CREATE INDEX `complaints_status_idx` ON `complaints` (`status`);--> statement-breakpoint
CREATE INDEX `corrective_actions_branch_idx` ON `correctiveActions` (`branchId`);--> statement-breakpoint
CREATE INDEX `daily_reports_branch_date_idx` ON `dailyReports` (`branchId`,`reportDate`);--> statement-breakpoint
CREATE INDEX `daily_reports_user_idx` ON `dailyReports` (`userId`);--> statement-breakpoint
CREATE INDEX `employees_branch_idx` ON `employees` (`branchId`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `notifications_branch_idx` ON `notifications` (`branchId`);--> statement-breakpoint
CREATE INDEX `performance_metric_idx` ON `performance` (`metricCode`,`periodDate`);--> statement-breakpoint
CREATE INDEX `performance_branch_date_idx` ON `performance` (`branchId`,`periodDate`);--> statement-breakpoint
CREATE INDEX `prospects_branch_idx` ON `prospects` (`branchId`);--> statement-breakpoint
CREATE INDEX `prospects_employee_idx` ON `prospects` (`employeeId`);--> statement-breakpoint
CREATE INDEX `prospects_status_idx` ON `prospects` (`status`);--> statement-breakpoint
CREATE INDEX `prospects_followup_idx` ON `prospects` (`nextFollowupAt`);--> statement-breakpoint
CREATE INDEX `quality_findings_branch_idx` ON `qualityFindings` (`branchId`);--> statement-breakpoint
CREATE INDEX `quality_findings_due_idx` ON `qualityFindings` (`dueDate`);--> statement-breakpoint
CREATE INDEX `quality_review_branch_date_idx` ON `qualityReviews` (`branchId`,`reviewDate`);--> statement-breakpoint
CREATE INDEX `reports_type_idx` ON `reports` (`reportType`);--> statement-breakpoint
CREATE INDEX `reports_period_idx` ON `reports` (`periodStart`,`periodEnd`);--> statement-breakpoint
CREATE INDEX `reports_branch_idx` ON `reports` (`branchId`);--> statement-breakpoint
CREATE INDEX `square_assignment_branch_idx` ON `squareAssignments` (`branchId`);--> statement-breakpoint
CREATE INDEX `targets_branch_metric_idx` ON `targets` (`branchId`,`metricCode`);--> statement-breakpoint
CREATE INDEX `visits_branch_idx` ON `visits` (`branchId`);--> statement-breakpoint
CREATE INDEX `visits_employee_idx` ON `visits` (`employeeId`);--> statement-breakpoint
CREATE INDEX `visits_date_idx` ON `visits` (`visitAt`);