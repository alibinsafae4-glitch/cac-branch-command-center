-- Additive alert lifecycle migration; existing notification rows and read flags are preserved.
ALTER TABLE `التنبيهات` ADD `مفتاح_التنبيه` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `حالة_التنبيه` enum('نشط','تمت_المراجعة','مؤجل','محلول','انتهى') DEFAULT 'نشط' NOT NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `وقت_الإقرار` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `معرف_المقر_اختياري` int NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `موعد_استئناف_التنبيه` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `وقت_الحل` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD `آخر_ظهور_للتنبيه` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD UNIQUE INDEX `التنبيهات_فريد_المفتاح` (`مفتاح_التنبيه`);
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD INDEX `التنبيهات_فهرس_المقر` (`معرف_المقر_اختياري`);
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD INDEX `التنبيهات_فهرس_الحالة` (`معرف_المستخدم_اختياري`, `حالة_التنبيه`, `وقت_الإنشاء`);
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD CONSTRAINT `fk_notification_acknowledger` FOREIGN KEY (`معرف_المقر_اختياري`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
