import { describe, expect, it } from "vitest";
import { isAllowedAttachmentContent, signAttachmentScope, verifyAttachmentScope } from "./attachmentProof";

const scope = { userId: 19, branchId: 4, key: "cbcc/visit-attachments/a1b2.pdf", name: "report.pdf", size: 9, issuedAt: 1_800_000_000_000 };

describe("scoped visit attachment proofs", () => {
  it("validates an unmodified user/branch/file/time scope", () => {
    const proof = signAttachmentScope("test-secret", scope);
    expect(verifyAttachmentScope("test-secret", scope, proof)).toBe(true);
  });

  it("rejects tampered or cross-user/cross-branch claims", () => {
    const proof = signAttachmentScope("test-secret", scope);
    expect(verifyAttachmentScope("test-secret", { ...scope, userId: 20 }, proof)).toBe(false);
    expect(verifyAttachmentScope("test-secret", { ...scope, branchId: 5 }, proof)).toBe(false);
    expect(verifyAttachmentScope("test-secret", { ...scope, key: "cbcc/visit-attachments/other.pdf" }, proof)).toBe(false);
    expect(verifyAttachmentScope("test-secret", { ...scope, size: 99 }, proof)).toBe(false);
    expect(verifyAttachmentScope("other-secret", scope, proof)).toBe(false);
    expect(verifyAttachmentScope("test-secret", scope, "not-a-proof")).toBe(false);
  });
});

describe("visit attachment signatures", () => {
  it("accepts matching PDF and image extensions/signatures", () => {
    expect(isAllowedAttachmentContent("application/pdf", "report.pdf", Buffer.from("%PDF-1.7\n"))).toBe(true);
    expect(isAllowedAttachmentContent("image/jpeg", "photo.jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isAllowedAttachmentContent("image/png", "photo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });

  it("rejects mismatched MIME/extensions and spoofed content", () => {
    expect(isAllowedAttachmentContent("application/pdf", "report.pdf", Buffer.from("not a pdf"))).toBe(false);
    expect(isAllowedAttachmentContent("application/pdf", "payload.exe", Buffer.from("%PDF-1.7"))).toBe(false);
    expect(isAllowedAttachmentContent("image/png", "photo.png", Buffer.from("not a png"))).toBe(false);
  });
});
