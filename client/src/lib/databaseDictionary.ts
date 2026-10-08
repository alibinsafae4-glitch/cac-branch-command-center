export type DictionaryField = { name: string; label: string };
export type DictionaryAction = { path: string; label: string; roles?: string[] };
export type DictionaryTable = {
  name: string;
  title: string;
  description: string;
  fields: DictionaryField[];
  action?: DictionaryAction;
  managedBySystem?: boolean;
};
export type DictionaryGroup = { title: string; description: string; tables: DictionaryTable[] };

const f = (name: string, label: string): DictionaryField => ({ name, label });
const admin = ["super_admin"];
const branchRoles = ["super_admin", "business_development", "branch_manager"];
const prospectRoles = ["super_admin", "business_development", "branch_manager", "branch_employee"];
const visitRoles = ["super_admin", "business_development", "quality", "branch_manager", "branch_employee"];
const qualityRoles = ["super_admin", "quality", "branch_manager"];
const targetRoles = ["super_admin", "executive", "business_development", "branch_manager"];
const intelligenceRoles = ["super_admin", "executive", "business_development"];

export const databaseDictionary: DictionaryGroup[] = [
  {
    title: "الهوية والصلاحيات",
    description: "حسابات الدخول والأدوار والموظفون المرتبطون بالفروع.",
    tables: [
      {
        name: "users", title: "المستخدمون", description: "حسابات Manus التي تدخل إلى النظام، مع الدور التجاري والفرع وحالة التفعيل.",
        action: { path: "/settings", label: "إدارة المستخدمين", roles: admin },
        fields: [f("id", "المعرّف الداخلي"), f("openId", "معرّف الدخول لدى Manus"), f("name", "اسم المستخدم"), f("email", "البريد الإلكتروني"), f("loginMethod", "طريقة تسجيل الدخول"), f("role", "الدور التقني"), f("appRole", "الدور داخل التطبيق"), f("assignedBranchId", "معرّف الفرع المسند"), f("employeeId", "معرّف الموظف"), f("isActive", "حالة تفعيل الحساب"), f("createdAt", "تاريخ إنشاء الحساب"), f("updatedAt", "تاريخ آخر تعديل"), f("lastSignedIn", "آخر تسجيل دخول")],
      },
      {
        name: "roles", title: "الأدوار", description: "أسماء الأدوار ووصفها وقائمة الصلاحيات المعتمدة.",
        action: { path: "/settings", label: "عرض الأدوار", roles: admin },
        fields: [f("roleKey", "رمز الدور الثابت"), f("nameAr", "اسم الدور بالعربية"), f("description", "وصف الدور"), f("permissions", "رموز الصلاحيات")],
      },
      {
        name: "employees", title: "الموظفون", description: "ملفات الموظفين المرتبطة بفرع، وتُستخدم لإسناد المربعات والأنشطة.",
        action: { path: "/settings", label: "ربط الموظف بالمستخدم", roles: admin },
        fields: [f("id", "المعرّف الداخلي"), f("employeeCode", "الرقم الوظيفي"), f("name", "اسم الموظف"), f("title", "المسمى الوظيفي"), f("branchId", "معرّف الفرع"), f("status", "حالة الموظف"), f("isDemo", "هل السجل تجريبي؟"), f("createdAt", "تاريخ إضافة السجل")],
      },
    ],
  },
  {
    title: "الفروع والتغطية الجغرافية",
    description: "تعريف الفروع والمربعات وعلاقات الإسناد بينها.",
    tables: [
      {
        name: "branches", title: "الفروع", description: "الاسم والرمز والنوع والحالة والفرع الأم وبيانات المسؤول وعدد الموظفين.",
        action: { path: "/branches", label: "فتح شاشة الفروع", roles: ["super_admin", "executive", "business_development", "branch_manager"] },
        fields: [f("id", "المعرّف الداخلي"), f("code", "رمز الفرع"), f("nameAr", "اسم الفرع بالعربية"), f("nameEn", "اسم الفرع بالإنجليزية"), f("managerName", "اسم المدير"), f("parentBranchCode", "رمز الفرع الأم"), f("branchType", "نوع الفرع"), f("status", "الحالة التشغيلية"), f("headcount", "عدد الموظفين"), f("createdAt", "تاريخ الإنشاء"), f("updatedAt", "آخر تحديث")],
      },
      {
        name: "squares", title: "المربعات الجغرافية", description: "المربعات الخمسة عشر التجريبية وبيانات المنطقة والحدود والمؤشرات الأساسية.",
        action: { path: "/squares", label: "فتح شاشة المربعات", roles: ["super_admin", "business_development", "branch_manager"] },
        fields: [f("id", "المعرّف الداخلي"), f("squareNumber", "رقم المربع"), f("name", "اسم المربع"), f("region", "المنطقة"), f("polygon", "نقاط حدود المربع التقريبية بصيغة JSON"), f("entitiesCount", "عدد الجهات"), f("companiesCount", "عدد الشركات"), f("organizationsCount", "عدد المنظمات"), f("merchantsCount", "عدد التجار"), f("targetValue", "القيمة المستهدفة"), f("createdAt", "تاريخ الإنشاء"), f("updatedAt", "آخر تحديث")],
      },
      {
        name: "squareAssignments", title: "إسناد المربعات", description: "يربط المربع بفرع وموظف؛ قد يكون للمربع أكثر من فرع مُسند.",
        action: { path: "/squares", label: "إدارة الإسناد من الخريطة", roles: ["super_admin", "business_development", "branch_manager"] },
        fields: [f("squareId", "معرّف المربع"), f("branchId", "معرّف الفرع"), f("employeeId", "معرّف الموظف (اختياري)"), f("isPrimary", "هل الإسناد أساسي؟"), f("createdAt", "تاريخ الإسناد")],
      },
    ],
  },
  {
    title: "الاستقطاب والنشاط الميداني",
    description: "العملاء المحتملون والزيارات والمستهدفات والقيم الفعلية والتقارير اليومية.",
    tables: [
      {
        name: "prospects", title: "العملاء المحتملون", description: "بيانات المتابعة والاستقطاب، وتُقيّد القراءة بحسب دور المستخدم وفرعه وإسناده.",
        action: { path: "/prospects", label: "فتح شاشة العملاء المحتملين", roles: prospectRoles },
        fields: [f("id", "المعرّف الداخلي"), f("name", "اسم العميل أو الجهة"), f("customerType", "نوع العميل"), f("sector", "القطاع"), f("activity", "طبيعة النشاط"), f("phone", "الهاتف"), f("email", "البريد الإلكتروني"), f("address", "العنوان"), f("squareId", "معرّف المربع"), f("branchId", "معرّف الفرع"), f("employeeId", "معرّف الموظف المكلف"), f("firstContactDate", "تاريخ أول تواصل"), f("lastFollowupAt", "تاريخ آخر متابعة"), f("nextFollowupAt", "موعد المتابعة القادمة"), f("products", "المنتجات المحتملة"), f("expectedValue", "القيمة المتوقعة"), f("status", "مرحلة الاستقطاب"), f("notes", "ملاحظات المتابعة"), f("createdBy", "معرّف منشئ السجل"), f("isDemo", "هل السجل تجريبي؟"), f("createdAt", "تاريخ الإنشاء"), f("updatedAt", "آخر تحديث")],
      },
      {
        name: "visits", title: "الزيارات الميدانية", description: "الجهة والموظف والفرع والوقت والنتيجة والمتابعة والمرفقات.",
        action: { path: "/visits", label: "فتح شاشة الزيارات", roles: visitRoles },
        fields: [f("id", "المعرّف الداخلي"), f("agencyName", "اسم الجهة"), f("agencyType", "نوع الجهة"), f("prospectId", "معرّف العميل المحتمل (اختياري)"), f("squareId", "معرّف المربع"), f("branchId", "معرّف الفرع"), f("employeeId", "معرّف الموظف"), f("visitAt", "تاريخ ووقت الزيارة"), f("location", "الموقع"), f("visitType", "نوع الزيارة"), f("personMet", "الشخص الذي تمت مقابلته"), f("result", "نتيجة الزيارة"), f("products", "المنتجات التي نوقشت"), f("opportunities", "الفرص الناتجة"), f("notes", "ملاحظات"), f("nextAction", "الإجراء التالي"), f("nextFollowupAt", "تاريخ المتابعة القادمة"), f("attachments", "المرفقات بصيغة JSON"), f("createdBy", "معرّف منشئ السجل"), f("isDemo", "هل السجل تجريبي؟"), f("createdAt", "تاريخ تسجيل الزيارة")],
      },
      {
        name: "targets", title: "المستهدفات", description: "القيمة المخطط لها لكل فرع ومؤشر وفترة زمنية.",
        action: { path: "/targets", label: "فتح شاشة المستهدفات", roles: targetRoles },
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("metricCode", "الرمز التقني للمؤشر"), f("metricName", "اسم المؤشر"), f("interval", "دورية المستهدف"), f("periodStart", "بداية الفترة"), f("targetValue", "القيمة المستهدفة"), f("createdBy", "معرّف منشئ السجل"), f("createdAt", "تاريخ الإضافة")],
      },
      {
        name: "performance", title: "الأداء الفعلي", description: "القيم اليومية الفعلية والسابقة لكل فرع ومؤشر؛ تُحدّثها مسارات التشغيل والتقارير.",
        action: { path: "/reports", label: "مراجعة الأداء عبر التقارير", roles: targetRoles },
        managedBySystem: true,
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("periodDate", "تاريخ الأداء"), f("metricCode", "الرمز التقني للمؤشر"), f("actualValue", "القيمة الفعلية"), f("previousValue", "قيمة الفترة السابقة"), f("updatedBy", "معرّف آخر من عدّل"), f("updatedAt", "وقت آخر تحديث")],
      },
      {
        name: "dailyReports", title: "التقارير اليومية", description: "إنتاج الحسابات والخدمات والزيارات والاتصالات والمتابعات والمعوقات والاحتياجات اليومية.",
        action: { path: "/reports", label: "فتح مركز التقارير", roles: ["super_admin", "business_development", "branch_manager", "branch_employee"] },
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("userId", "معرّف المستخدم"), f("reportDate", "تاريخ التقرير"), f("individualAccounts", "حسابات الأفراد"), f("companyAccounts", "حسابات الشركات"), f("organizationAccounts", "حسابات المنظمات"), f("governmentAccounts", "حسابات الجهات الحكومية"), f("cacFast", "عمليات CAC Fast"), f("cards", "البطاقات"), f("transfers", "الحوالات"), f("digitalServices", "الخدمات الرقمية"), f("visitsCount", "عدد الزيارات"), f("meetingsCount", "عدد الاجتماعات"), f("callsCount", "عدد الاتصالات"), f("newCustomers", "العملاء الجدد"), f("newOpportunities", "الفرص الجديدة"), f("followups", "المتابعات"), f("obstacles", "المعوقات"), f("needs", "الاحتياجات"), f("status", "حالة التقرير"), f("createdAt", "تاريخ الإنشاء"), f("updatedAt", "آخر تحديث")],
      },
    ],
  },
  {
    title: "الجودة ومعالجة الشكاوى",
    description: "تقييمات الخدمة والملاحظات والإجراءات التصحيحية والشكاوى.",
    tables: [
      {
        name: "complaints", title: "الشكاوى", description: "نوع الشكوى وفرعها وتاريخها ومسؤولها ومدة معالجتها وحالتها.",
        action: { path: "/quality", label: "فتح شاشة الجودة", roles: qualityRoles },
        fields: [f("id", "المعرّف الداخلي"), f("complaintType", "نوع الشكوى"), f("branchId", "معرّف الفرع"), f("complaintDate", "تاريخ الشكوى"), f("ownerName", "المسؤول عن المعالجة"), f("processingDays", "أيام المعالجة"), f("status", "حالة الشكوى"), f("details", "التفاصيل"), f("createdAt", "تاريخ الإضافة"), f("updatedAt", "آخر تحديث")],
      },
      {
        name: "qualityReviews", title: "تقييمات الجودة", description: "درجات الاستقبال والسرعة والدقة وتجربة العميل والالتزام بالإجراءات والنماذج وKYC والتعليمات.",
        action: { path: "/quality", label: "فتح شاشة الجودة", roles: qualityRoles },
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("reviewDate", "تاريخ التقييم"), f("reception", "تقييم الاستقبال"), f("speed", "تقييم سرعة الخدمة"), f("accuracy", "تقييم دقة المعاملة"), f("customerExperience", "تقييم تجربة العميل"), f("procedures", "الالتزام بالإجراءات"), f("forms", "الالتزام بالنماذج"), f("kyc", "الالتزام بمتطلبات KYC"), f("instructions", "الالتزام بالتعليمات"), f("reviewer", "اسم المقيّم"), f("notes", "ملاحظات التقييم"), f("createdAt", "تاريخ الإضافة")],
      },
      {
        name: "qualityFindings", title: "ملاحظات الجودة", description: "ملاحظات مصنفة بحسب الأهمية والمسؤول والموعد والحالة.",
        action: { path: "/quality", label: "فتح شاشة الجودة", roles: qualityRoles },
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("finding", "نص الملاحظة"), f("severity", "درجة الأهمية"), f("ownerName", "المسؤول"), f("dueDate", "تاريخ الاستحقاق"), f("status", "حالة المعالجة"), f("createdAt", "تاريخ الإضافة")],
      },
      {
        name: "correctiveActions", title: "الإجراءات التصحيحية", description: "إجراءات التحسين والمسؤول عنها وموعدها ونسبة إنجازها وحالتها.",
        action: { path: "/quality", label: "فتح شاشة الجودة", roles: qualityRoles },
        fields: [f("id", "المعرّف الداخلي"), f("branchId", "معرّف الفرع"), f("action", "وصف الإجراء التصحيحي"), f("ownerName", "المسؤول"), f("executionDate", "موعد التنفيذ"), f("progress", "نسبة الإنجاز"), f("status", "حالة الإجراء"), f("createdAt", "تاريخ الإضافة")],
      },
    ],
  },
  {
    title: "التقارير والتحليلات وسجل النظام",
    description: "المخرجات المحفوظة والتنبيهات والتحليلات والإعدادات وأثر التغييرات.",
    tables: [
      {
        name: "reports", title: "التقارير المحفوظة", description: "نوع التقرير وعنوانه وفترته والفرع الاختياري والبيانات المجمعة.",
        action: { path: "/reports", label: "فتح مركز التقارير", roles: ["super_admin", "executive", "business_development", "quality", "branch_manager", "branch_employee"] },
        fields: [f("id", "المعرّف الداخلي"), f("reportType", "نوع التقرير"), f("title", "عنوان التقرير"), f("branchId", "معرّف الفرع (اختياري)"), f("periodStart", "بداية الفترة"), f("periodEnd", "نهاية الفترة"), f("reportData", "بيانات التقرير المجمعة بصيغة JSON"), f("createdBy", "معرّف منشئ التقرير"), f("createdAt", "وقت الإنشاء")],
      },
      {
        name: "notifications", title: "التنبيهات", description: "رسائل النظام الموجهة لمستخدم أو فرع وحالة قراءتها.",
        action: { path: "/alerts", label: "عرض التنبيهات", roles: ["super_admin", "executive", "business_development", "quality", "branch_manager", "branch_employee"] },
        managedBySystem: true,
        fields: [f("id", "المعرّف الداخلي"), f("userId", "معرّف المستخدم (اختياري)"), f("branchId", "معرّف الفرع (اختياري)"), f("type", "نوع التنبيه"), f("title", "عنوان التنبيه"), f("body", "نص التنبيه"), f("isRead", "هل تمت القراءة؟"), f("createdAt", "وقت الإنشاء")],
      },
      {
        name: "aiInsights", title: "تحليلات الذكاء الاصطناعي", description: "ملخصات تحليلية وتوصيات مرتبطة بفترة ومستخدم منشئ؛ تحفظ دون أسماء العملاء أو معرّفاتهم.",
        action: { path: "/intelligence", label: "فتح ذكاء الأعمال", roles: intelligenceRoles },
        managedBySystem: true,
        fields: [f("id", "المعرّف الداخلي"), f("generatedBy", "معرّف منشئ التحليل"), f("periodLabel", "الفترة التحليلية"), f("headline", "عنوان التحليل"), f("content", "نص التحليل"), f("recommendations", "التوصيات بصيغة JSON"), f("sourceSummary", "ملخص المصادر بصيغة JSON"), f("createdAt", "وقت الإنشاء")],
      },
      {
        name: "branchScoreWeights", title: "أوزان تقييم الفروع", description: "نسبة مساهمة كل مؤشر في Branch Score؛ يجب أن يساوي مجموع النسب 100%.",
        action: { path: "/settings", label: "تعديل الأوزان", roles: admin },
        fields: [f("metricCode", "رمز المؤشر"), f("metricName", "اسم المؤشر"), f("weightPercent", "وزن المؤشر كنسبة مئوية"), f("updatedBy", "معرّف آخر من عدّل"), f("updatedAt", "وقت آخر تحديث")],
      },
      {
        name: "auditLogs", title: "سجل التدقيق", description: "أثر تغييرات الإنشاء والتعديل والحذف وتغيير الدور؛ لا يتضمن النصوص الحساسة كاملة.",
        action: { path: "/settings", label: "عرض سجل التدقيق", roles: admin },
        managedBySystem: true,
        fields: [f("id", "المعرّف الداخلي"), f("actorUserId", "معرّف المستخدم المنفّذ"), f("action", "نوع العملية"), f("entity", "نوع السجل المتأثر"), f("entityId", "معرّف السجل المتأثر"), f("previousValue", "القيم السابقة بصيغة JSON"), f("newValue", "القيم الجديدة بصيغة JSON"), f("createdAt", "وقت العملية")],
      },
      {
        name: "appSettings", title: "إعدادات التطبيق", description: "إعدادات داخلية بصيغة مفتاح وقيمة؛ تُدار من صفحة إعدادات النظام.",
        action: { path: "/settings", label: "فتح إعدادات النظام", roles: admin },
        managedBySystem: true,
        fields: [f("settingKey", "مفتاح الإعداد"), f("settingValue", "قيمة الإعداد بصيغة JSON"), f("updatedBy", "معرّف آخر من عدّل"), f("updatedAt", "وقت آخر تحديث")],
      },
    ],
  },
];

export const allDictionaryTables = databaseDictionary.flatMap(group => group.tables);
