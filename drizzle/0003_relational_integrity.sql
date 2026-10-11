-- Additive relational integrity migration; no rows are deleted or rewritten.
-- Generated only after verifying every table/column, unique-key candidate and FK orphan count.
ALTER TABLE `المستخدمون` ADD INDEX `المستخدمون_فهرس_الفرع` (`معرف_الفرع_المسند`);
--> statement-breakpoint
ALTER TABLE `المستخدمون` ADD INDEX `المستخدمون_فهرس_الموظف` (`معرف_الموظف`);
--> statement-breakpoint
ALTER TABLE `تحليلات_الذكاء_الاصطناعي` ADD INDEX `تحليلات_الذكاء_فهرس_المنشئ` (`معرف_منشئ_التحليل`);
--> statement-breakpoint
ALTER TABLE `إعدادات_التطبيق` ADD INDEX `إعدادات_التطبيق_فهرس_المعدل` (`معرف_آخر_من_عدل`);
--> statement-breakpoint
ALTER TABLE `أوزان_تقييم_الفروع` ADD INDEX `أوزان_التقييم_فهرس_المعدل` (`معرف_آخر_من_عدل`);
--> statement-breakpoint
ALTER TABLE `التقارير_اليومية` ADD UNIQUE INDEX `فريد_يومي_مستخدم` (`معرف_الفرع`, `معرف_المستخدم`, `تاريخ_التقرير`);
--> statement-breakpoint
ALTER TABLE `الأداء_الفعلي` ADD INDEX `الأداء_الفعلي_فهرس_المعدل` (`معرف_آخر_من_عدل`);
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD INDEX `العملاء_المحتملون_فهرس_المربع` (`معرف_المربع`);
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD INDEX `العملاء_المحتملون_فهرس_المنشئ` (`معرف_منشئ_السجل`);
--> statement-breakpoint
ALTER TABLE `التقارير_المحفوظة` ADD INDEX `التقارير_المحفوظة_فهرس_المنشئ` (`معرف_منشئ_التقرير`);
--> statement-breakpoint
ALTER TABLE `إسناد_المربعات` ADD INDEX `إسناد_المربعات_فهرس_الموظف` (`معرف_الموظف_اختياري`);
--> statement-breakpoint
ALTER TABLE `المستهدفات` ADD INDEX `المستهدفات_فهرس_المنشئ` (`معرف_منشئ_السجل`);
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD INDEX `الزيارات_الميدانية_فهرس_العميل` (`معرف_العميل_المحتمل_اختياري`);
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD INDEX `الزيارات_الميدانية_فهرس_المربع` (`معرف_المربع`);
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD INDEX `الزيارات_الميدانية_فهرس_المنشئ` (`معرف_منشئ_السجل`);
--> statement-breakpoint
ALTER TABLE `الموظفون` ADD CONSTRAINT `fk_employees_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `المستخدمون` ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`معرف_الفرع_المسند`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `المستخدمون` ADD CONSTRAINT `fk_users_employee` FOREIGN KEY (`معرف_الموظف`) REFERENCES `الموظفون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `تحليلات_الذكاء_الاصطناعي` ADD CONSTRAINT `fk_ai_creator` FOREIGN KEY (`معرف_منشئ_التحليل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `إعدادات_التطبيق` ADD CONSTRAINT `fk_setting_updater` FOREIGN KEY (`معرف_آخر_من_عدل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `سجل_التدقيق` ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`معرف_المستخدم_المنفذ`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `أوزان_تقييم_الفروع` ADD CONSTRAINT `fk_score_weight_updater` FOREIGN KEY (`معرف_آخر_من_عدل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الشكاوى` ADD CONSTRAINT `fk_complaint_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الإجراءات_التصحيحية` ADD CONSTRAINT `fk_corrective_action_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `التقارير_اليومية` ADD CONSTRAINT `fk_daily_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`معرف_المستخدم_اختياري`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `التنبيهات` ADD CONSTRAINT `fk_notification_branch` FOREIGN KEY (`معرف_الفرع_اختياري`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الأداء_الفعلي` ADD CONSTRAINT `fk_performance_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الأداء_الفعلي` ADD CONSTRAINT `fk_performance_updater` FOREIGN KEY (`معرف_آخر_من_عدل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD CONSTRAINT `fk_prospect_square` FOREIGN KEY (`معرف_المربع`) REFERENCES `المربعات_الجغرافية` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD CONSTRAINT `fk_prospect_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD CONSTRAINT `fk_prospect_employee` FOREIGN KEY (`معرف_الموظف_المكلف`) REFERENCES `الموظفون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `العملاء_المحتملون` ADD CONSTRAINT `fk_prospect_creator` FOREIGN KEY (`معرف_منشئ_السجل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `ملاحظات_الجودة` ADD CONSTRAINT `fk_quality_finding_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `تقييمات_الجودة` ADD CONSTRAINT `fk_quality_review_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `التقارير_المحفوظة` ADD CONSTRAINT `fk_report_branch` FOREIGN KEY (`معرف_الفرع_اختياري`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `التقارير_المحفوظة` ADD CONSTRAINT `fk_report_creator` FOREIGN KEY (`معرف_منشئ_التقرير`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `إسناد_المربعات` ADD CONSTRAINT `fk_square_assignment_square` FOREIGN KEY (`معرف_المربع`) REFERENCES `المربعات_الجغرافية` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `إسناد_المربعات` ADD CONSTRAINT `fk_square_assignment_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `إسناد_المربعات` ADD CONSTRAINT `fk_square_assignment_employee` FOREIGN KEY (`معرف_الموظف_اختياري`) REFERENCES `الموظفون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `المستهدفات` ADD CONSTRAINT `fk_target_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `المستهدفات` ADD CONSTRAINT `fk_target_creator` FOREIGN KEY (`معرف_منشئ_السجل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD CONSTRAINT `fk_visit_prospect` FOREIGN KEY (`معرف_العميل_المحتمل_اختياري`) REFERENCES `العملاء_المحتملون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD CONSTRAINT `fk_visit_square` FOREIGN KEY (`معرف_المربع`) REFERENCES `المربعات_الجغرافية` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD CONSTRAINT `fk_visit_branch` FOREIGN KEY (`معرف_الفرع`) REFERENCES `الفروع` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD CONSTRAINT `fk_visit_employee` FOREIGN KEY (`معرف_الموظف`) REFERENCES `الموظفون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `الزيارات_الميدانية` ADD CONSTRAINT `fk_visit_creator` FOREIGN KEY (`معرف_منشئ_السجل`) REFERENCES `المستخدمون` (`المعرف_الداخلي`) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
