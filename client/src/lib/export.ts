const spreadsheetValue = (value: unknown) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return value;
  return /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
};

const safeFilename = (filename: string) => filename.replace(/[\\/:*?"<>|]+/g, "-").replace(/\.(csv|xlsx)$/i, "").slice(0, 100) || "report";

export async function exportExcel(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const headers = Object.keys(rows[0]);
  const values = [headers, ...rows.map(row => headers.map(key => spreadsheetValue(row[key])))];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const range = worksheet["!ref"] ?? "A1";
  worksheet["!autofilter"] = { ref: range };
  worksheet["!cols"] = headers.map(header => ({ wch: Math.min(40, Math.max(14, header.length + 3)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
  workbook.Props = { Title: "CAC Branch Command Center", Subject: "تقرير بيانات تجريبية", Author: "CAC BANK" };
  XLSX.writeFile(workbook, `${safeFilename(filename)}.xlsx`, { compression: true });
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(spreadsheetValue(value) ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map(row => headers.map(key => escape(row[key])).join(","))].join("\r\n");
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

export const printReport = () => window.print();
