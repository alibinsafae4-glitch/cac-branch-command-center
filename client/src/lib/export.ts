const spreadsheetValue = (value: unknown) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return value;
  return /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
};

const safeFilename = (filename: string) => filename.replace(/[\\/:*?"<>|]+/g, "-").replace(/\.(csv|xlsx)$/i, "").slice(0, 100) || "report";
const demoSource = "بيانات تجريبية لأغراض العرض فقط — لا تمثل سجلات مصرفية حقيقية";
const exportTimestamp = () => new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Aden" }).format(new Date());
const addExportMetadata = (rows: Array<Record<string, unknown>>, timestamp: string): Array<Record<string, unknown>> => rows.map(row => ({ ...row, مصدر_البيانات: demoSource, وقت_التصدير_بتوقيت_عدن: timestamp }));

export async function exportExcel(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const timestamp = exportTimestamp();
  const exportRows = addExportMetadata(rows, timestamp);
  const headers = Object.keys(exportRows[0]);
  const values = [headers, ...exportRows.map(row => headers.map(key => spreadsheetValue(row[key])))];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const range = worksheet["!ref"] ?? "A1";
  worksheet["!autofilter"] = { ref: range };
  worksheet["!cols"] = headers.map(header => ({ wch: Math.min(40, Math.max(14, header.length + 3)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
  const metadata = XLSX.utils.aoa_to_sheet([["بيانات وصفية", "القيمة"], ["مصدر البيانات", demoSource], ["وقت التصدير (عدن UTC+3)", timestamp], ["عدد السجلات", rows.length], ["تنبيه", "لا تستخدم هذه البيانات لاتخاذ قرارات مصرفية حقيقية."]]);
  XLSX.utils.book_append_sheet(workbook, metadata, "مصدر البيانات");
  workbook.Props = { Title: "CAC Branch Command Center", Subject: demoSource, Author: "CAC BANK" };
  XLSX.writeFile(workbook, `${safeFilename(filename)}.xlsx`, { compression: true });
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const timestamp = exportTimestamp();
  const exportRows = addExportMetadata(rows, timestamp);
  const headers = Object.keys(exportRows[0]);
  const escape = (value: unknown) => `"${String(spreadsheetValue(value) ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...exportRows.map(row => headers.map(key => escape(row[key])).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(filename)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const printReport = () => {
  document.body.classList.add("cbcc-printing-demo");
  window.addEventListener("afterprint", () => document.body.classList.remove("cbcc-printing-demo"), { once: true });
  window.print();
};
