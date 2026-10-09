import fs from "node:fs";
import ts from "typescript";

const dictionaryPath = new URL("../client/src/lib/databaseDictionary.ts", import.meta.url);
const outputPath = new URL("../drizzle/arabic-identifiers.json", import.meta.url);
const source = fs.readFileSync(dictionaryPath, "utf8");
const ast = ts.createSourceFile(dictionaryPath.pathname, source, ts.ScriptTarget.Latest, true);

function property(object, name) {
  return object.properties.find(item => {
    const key = item.name;
    return key && (ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === name;
  })?.initializer;
}
function stringValue(node) {
  if (!node || (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node))) throw new Error("Expected a static string in the database dictionary");
  return node.text;
}
function slug(label) {
  return label
    .replace(/CAC\s*Fast/gi, "كاك فاست")
    .replace(/KYC/gi, "اعرف عميلك")
    .replace(/JSON/gi, "جيسون")
    .replace(/PDF/gi, "بي دي اف")
    .replace(/CSV/gi, "سي اس في")
    .replace(/Manus/gi, "مانوس")
    .replace(/URL/gi, "الرابط")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\u0621-\u064A\u0660-\u06690-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
let declaration;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "databaseDictionary") declaration = node.initializer;
  ts.forEachChild(node, visit);
}
visit(ast);
if (!declaration || !ts.isArrayLiteralExpression(declaration)) throw new Error("databaseDictionary array not found");
const tables = {};
for (const group of declaration.elements) {
  const tableNodes = property(group, "tables");
  if (!tableNodes || !ts.isArrayLiteralExpression(tableNodes)) continue;
  for (const table of tableNodes.elements) {
    const logicalName = stringValue(property(table, "name"));
    const tableTitle = stringValue(property(table, "title"));
    const tableName = slug(tableTitle);
    const fieldsNode = property(table, "fields");
    if (!fieldsNode || !ts.isArrayLiteralExpression(fieldsNode)) throw new Error(`Fields are missing for ${logicalName}`);
    const columns = {};
    const used = new Map();
    for (const field of fieldsNode.elements) {
      if (!ts.isCallExpression(field) || field.arguments.length < 2) throw new Error(`Unexpected field entry in ${logicalName}`);
      const logicalColumn = stringValue(field.arguments[0]);
      const label = stringValue(field.arguments[1]);
      const columnName = slug(label);
      if (!columnName) throw new Error(`Arabic identifier is empty: ${logicalName}.${logicalColumn}`);
      if (columnName.length > 64) throw new Error(`MySQL identifier is longer than 64 characters: ${logicalName}.${logicalColumn} (${columnName.length})`);
      if (used.has(columnName)) throw new Error(`Duplicate Arabic field name in ${logicalName}: ${columnName} (${used.get(columnName)}, ${logicalColumn})`);
      used.set(columnName, logicalColumn);
      columns[logicalColumn] = columnName;
    }
    if (Object.values(tables).some(t => t.databaseName === tableName)) throw new Error(`Duplicate Arabic table name: ${tableName}`);
    tables[logicalName] = { databaseName: tableName, columns };
  }
}
const result = { version: 1, language: "ar", tables };
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Generated Arabic MySQL identifiers for ${Object.keys(tables).length} tables at ${outputPath.pathname}`);
for (const [name, item] of Object.entries(tables)) console.log(`${name} -> ${item.databaseName} (${Object.keys(item.columns).length} columns)`);
