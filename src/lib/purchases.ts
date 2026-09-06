import { FunctionsHttpError } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export function getPaidProductId(subjectCode: string): string | null {
  if (subjectCode === "DSAI101") return "dsai101"
  if (subjectCode === "IDSAI101") return "idsai101"
  if (subjectCode === "SQA101") return "sqa101"
  if (subjectCode === "SEC301") return "sec301"
  if (subjectCode === "MAR101") return "mar101"
  if (subjectCode === "MAC102") return "mac102"
  if (subjectCode === "OIT101") return "oit101"
  return null
}

export async function createPaidCheckout(productId = "dsai101") {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  let session = sessionData.session
  if (!session || session.expires_at && session.expires_at * 1000 <= Date.now() + 30_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw refreshError
    session = refreshed.session
  }
  const accessToken = session?.access_token
  if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
  const { data: verifiedSession, error: verifyError } = await supabase.auth.getUser(accessToken)
  if (verifyError || !verifiedSession.user) throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng xuất và đăng nhập lại.")
  const { data, error } = await supabase.functions.invoke("create-sepay-checkout", {
    body: { productId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json() as { error?: string }
        if (body.error) throw new Error(body.error)
      } catch (responseError) {
        if (responseError instanceof Error && responseError.message !== error.message) throw responseError
      }
    }
    throw error
  }
  return data as {
    owned: boolean
    orderId?: string
    checkoutUrl?: string
    fields?: Record<string, string | number>
    payment?: { qrUrl: string }
  }
}

export const createDsaiCheckout = () => createPaidCheckout("dsai101")

export async function hasProductPurchase(userId: string, productId: string) {
  const { data, error } = await supabase.from("purchases").select("id").eq("user_id", userId).eq("product_id", productId).eq("status", "paid").maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export const hasDsaiPurchase = (userId: string) => hasProductPurchase(userId, "dsai101")
