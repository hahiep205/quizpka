import { parseQuestionBank, QuestionBankDataError } from "@/features/quiz/lib/questionBankSchema"
import type { BankFile } from "@/features/quiz/model/quiz.types"
import { supabase } from "@/lib/supabase"

/** Private bucket holding free bank JSONs (TADV free, ...). */
export const FREE_BANK_BUCKET = "free-question-banks"

/** Object path inside the bucket mirrors the /data/... key without the prefix. */
export function freeBankObjectPath(bankPath: string): string {
  return bankPath.replace(/^\/data\//, "")
}

/**
 * Downloads a free bank JSON from the private Storage bucket with the anon
 * key (allowed by the storage.objects SELECT policy). Media referenced inside
 * the bank (audio, images) keeps resolving via toMediaUrl (R2).
 */
export async function downloadFreeBank(bankPath: string, signal?: AbortSignal): Promise<BankFile> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const { data, error } = await supabase.storage.from(FREE_BANK_BUCKET).download(freeBankObjectPath(bankPath))
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  if (error || !data) {
    throw new QuestionBankDataError(bankPath, `storage download failed: ${error?.message ?? "empty response"}`)
  }
  let json: unknown
  try {
    json = JSON.parse(await data.text())
  } catch {
    throw new QuestionBankDataError(bankPath, "response is not valid JSON")
  }
  return parseQuestionBank(json, bankPath)
}
