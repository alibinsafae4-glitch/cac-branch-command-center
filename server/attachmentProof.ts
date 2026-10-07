import { createHmac, timingSafeEqual } from "node:crypto";

export type AttachmentProofScope = {
  userId: number;
  branchId: number;
  key: string;
  name: string;
  size: number;
  issuedAt: number;
};

export function signAttachmentScope(secret: string, scope: AttachmentProofScope): string {
  return createHmac("sha256", secret).update(JSON.stringify([
    scope.userId,
    scope.branchId,
    scope.key,
    scope.name,
    scope.size,
    scope.issuedAt,
  ])).digest("hex");
}

export function verifyAttachmentScope(secret: string, scope: AttachmentProofScope, proof: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(proof)) return false;
  const expected = Buffer.from(signAttachmentScope(secret, scope), "hex");
  const supplied = Buffer.from(proof, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

const extensionsByMime: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
};

export function isAllowedAttachmentContent(contentType: string, name: string, bytes: Uint8Array): boolean {
  const allowedExtensions = extensionsByMime[contentType];
  const extension = name.split(".").pop()?.toLowerCase();
  if (!allowedExtensions || !extension || !allowedExtensions.includes(extension) || bytes.length < 4) return false;
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (contentType === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (contentType === "application/pdf") return String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
  // DOCX/XLSX are ZIP containers; this checks the container signature, not the package contents.
  return starts(0x50, 0x4b) && (starts(0x50, 0x4b, 0x03, 0x04) || starts(0x50, 0x4b, 0x05, 0x06) || starts(0x50, 0x4b, 0x07, 0x08));
}
