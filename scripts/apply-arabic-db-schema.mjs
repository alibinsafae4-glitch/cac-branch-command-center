import fs from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const identifiers = JSON.parse(fs.readFileSync(new URL("drizzle/arabic-identifiers.json", root), "utf8"));
const dbValues = {
  user: "مستخدم", admin: "مدير",
  super_admin: "مدير_النظام", executive: "الإدارة_العليا", business_development: "تطوير_الأعمال", quality: "توكيد_الجودة", branch_manager: "مدير_الفرع", branch_employee: "موظف_الفرع",
  branch: "فرع", suboffice: "مكتب_فرعي", islamic: "إسلامي", active: "نشط", inactive: "غير_نشط",
  new: "جديد", contacted: "تم_التواصل", visited: "تمت_الزيارة", following_up: "قيد_المتابعة", negotiation: "قيد_التفاوض", converted: "تم_الاستقطاب", not_interested: "غير_مهتم", deferred: "مؤجل",
  daily: "يومي", weekly: "أسبوعي", monthly: "شهري", quarterly: "ربع_سنوي", yearly: "سنوي",
  draft: "مسودة", submitted: "مرسل", open: "مفتوح", in_progress: "قيد_التنفيذ", resolved: "تمت_المعالجة", closed: "مغلق",
  low: "منخفض", medium: "متوسط", high: "مرتفع", critical: "حرج",
  danger: "خطر", success: "نجاح", reminder: "تذكير", info: "معلومات", warning: "تحذير",
  create: "إنشاء", update: "تعديل", delete: "حذف", role_change: "تغيير_الدور", login: "تسجيل_الدخول",
};
fs.writeFileSync(new URL("drizzle/arabic-values.json", root), `${JSON.stringify({ version: 1, values: dbValues }, null, 2)}\n`);

const editsByFile = new Map();
function replaceRange(file, start, end, text) {
  const list = editsByFile.get(file) ?? [];
  list.push({ start, end, text });
  editsByFile.set(file, list);
}
function stringValue(node) { return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined; }
function applyEdits(file, source, edits) {
  const ordered = edits.sort((a, b) => b.start - a.start);
  for (const edit of ordered) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  fs.writeFileSync(file, source);
}

function transformSchema(relativePath) {
  const file = new URL(relativePath, root).pathname;
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "mysqlTable") {
      const oldTable = stringValue(node.arguments[0]);
      if (oldTable && identifiers.tables[oldTable]) {
        const mapping = identifiers.tables[oldTable];
        const tableName = mapping.databaseName;
        if (oldTable !== tableName) replaceRange(file, node.arguments[0].getStart(ast), node.arguments[0].getEnd(), JSON.stringify(tableName));
        const columnsArg = node.arguments[1];
        if (columnsArg && ts.isObjectLiteralExpression(columnsArg)) {
          for (const prop of columnsArg.properties) {
            if (!ts.isPropertyAssignment(prop) || !prop.name || !prop.initializer) continue;
            const propName = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
            if (!propName) continue;
            const newColumn = mapping.columns[propName];
            const findColumnBuilder = child => {
              if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && ["boolean", "date", "decimal", "int", "json", "mysqlEnum", "text", "timestamp", "varchar"].includes(child.expression.text) && child.arguments.length) {
                const oldColumn = stringValue(child.arguments[0]);
                if (oldColumn && newColumn && oldColumn !== newColumn) replaceRange(file, child.arguments[0].getStart(ast), child.arguments[0].getEnd(), JSON.stringify(newColumn));
              }
              ts.forEachChild(child, findColumnBuilder);
            };
            findColumnBuilder(prop.initializer);
          }
        }
        let indexNumber = 0;
        const visitTable = child => {
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && ["index", "uniqueIndex"].includes(child.expression.text) && child.arguments.length) {
            const oldIndex = stringValue(child.arguments[0]);
            if (oldIndex && !/^فهرس_/.test(oldIndex)) {
              indexNumber += 1;
              const indexName = `${tableName}_فهرس_${String(indexNumber).padStart(2, "0")}`.slice(0, 63);
              replaceRange(file, child.arguments[0].getStart(ast), child.arguments[0].getEnd(), JSON.stringify(indexName));
            }
          }
          if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression) && child.expression.name.text === "unique" && child.arguments.length === 0) {
            const colProp = child.parent;
            const colName = colProp && ts.isPropertyAssignment(colProp) && (ts.isIdentifier(colProp.name) || ts.isStringLiteral(colProp.name)) ? colProp.name.text : "قيمة";
            const uniqueName = `${tableName}_فريد_${mapping.columns[colName] ?? colName}`.slice(0, 63);
            replaceRange(file, child.getEnd() - 1, child.getEnd() - 1, `${child.getText(ast).endsWith("()") ? JSON.stringify(uniqueName) : ""}`);
          }
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "mysqlEnum") {
            const list = child.arguments[1];
            if (list && ts.isArrayLiteralExpression(list)) for (const item of list.elements) {
              const value = stringValue(item);
              if (value && dbValues[value]) replaceRange(file, item.getStart(ast), item.getEnd(), JSON.stringify(dbValues[value]));
            }
          }
          if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression) && child.expression.name.text === "default" && child.arguments.length === 1) {
            const value = stringValue(child.arguments[0]);
            if (value && dbValues[value]) replaceRange(file, child.arguments[0].getStart(ast), child.arguments[0].getEnd(), JSON.stringify(dbValues[value]));
          }
          ts.forEachChild(child, visitTable);
        };
        if (node.arguments[2]) visitTable(node.arguments[2]);
        if (columnsArg) visitTable(columnsArg);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (editsByFile.has(file)) applyEdits(file, source, editsByFile.get(file));
}

transformSchema("drizzle/schema.ts");
transformSchema("drizzle/business.ts");

// Persist explicit database identifiers beside their stable application-facing field names.
const dictionaryFile = new URL("client/src/lib/databaseDictionary.ts", root).pathname;
let dictionary = fs.readFileSync(dictionaryFile, "utf8");
const dictionaryAst = ts.createSourceFile(dictionaryFile, dictionary, ts.ScriptTarget.Latest, true);
const dictionaryEdits = [];
function prop(object, name) { return object.properties.find(p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === name)?.initializer; }
const visitDictionary = node => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "databaseDictionary" && ts.isArrayLiteralExpression(node.initializer)) {
    for (const group of node.initializer.elements) {
      const tables = prop(group, "tables");
      if (!tables || !ts.isArrayLiteralExpression(tables)) continue;
      for (const table of tables.elements) {
        const nameNode = prop(table, "name");
        const logicalName = stringValue(nameNode);
        const mapping = identifiers.tables[logicalName];
        if (!mapping) continue;
        const titleProperty = table.properties.find(p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === "title");
        if (titleProperty) dictionaryEdits.push({ start: titleProperty.getStart(dictionaryAst), end: titleProperty.getStart(dictionaryAst), text: `databaseName: ${JSON.stringify(mapping.databaseName)}, ` });
        const fields = prop(table, "fields");
        if (!fields || !ts.isArrayLiteralExpression(fields)) continue;
        for (const field of fields.elements) {
          if (!ts.isCallExpression(field) || field.arguments.length < 2) continue;
          const key = stringValue(field.arguments[0]);
          const physicalName = mapping.columns[key];
          if (!physicalName) continue;
          if (field.arguments.length < 3) {
            const insertion = field.arguments[1].getEnd();
            dictionaryEdits.push({ start: insertion, end: insertion, text: `, ${JSON.stringify(physicalName)}` });
          }
        }
      }
    }
  }
  ts.forEachChild(node, visitDictionary);
};
visitDictionary(dictionaryAst);
for (const edit of dictionaryEdits.sort((a, b) => b.start - a.start)) dictionary = dictionary.slice(0, edit.start) + edit.text + dictionary.slice(edit.end);
dictionary = dictionary.replace('export type DictionaryField = { name: string; label: string };', 'export type DictionaryField = { name: string; label: string; databaseName: string };');
dictionary = dictionary.replace('  name: string;\n  title: string;', '  name: string;\n  databaseName: string;\n  title: string;');
dictionary = dictionary.replace('const f = (name: string, label: string): DictionaryField => ({ name, label });', 'const f = (name: string, label: string, databaseName: string): DictionaryField => ({ name, label, databaseName });');
fs.writeFileSync(dictionaryFile, dictionary);
console.log("Updated Drizzle table/column names, enum values and dictionary mappings to Arabic.");
