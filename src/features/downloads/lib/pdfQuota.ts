import { supabase } from "@/lib/supabase"

export type PdfQuotaResult = { allowed: boolean; remaining: number }
export type PdfQuotaRateLimited = { rateLimited: true }

/**
 * Trừ 1 lượt tải PDF của hôm nay (server-side, nguyên tử).
 * - { allowed: false } -> hết quota ngày, chặn.
 * - { rateLimited: true } -> bấm quá nhanh (20/phút), chặn tạm thời.
 * - null -> không kiểm tra được (VD: migration chưa chạy, rớt mạng) -> cho qua
 *   để không chặn nhầm; sau khi chạy migration, RPC luôn tồn tại.
 */
export async function claimPdfDownload(): Promise<PdfQuotaResult | PdfQuotaRateLimited | null> {
  try {
    const { data, error } = await supabase.rpc("claim_pdf_download")
    if (error) {
      if (/too many requests/i.test(error.message ?? "")) return { rateLimited: true }
      return null
    }
    const row = data as { allowed?: boolean; remaining?: number } | null
    if (!row || typeof row.allowed !== "boolean") return null
    return {
      allowed: row.allowed,
      remaining: typeof row.remaining === "number" ? row.remaining : 0,
    }
  } catch {
    return null
  }
}
