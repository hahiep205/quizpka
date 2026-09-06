import { FunctionsHttpError } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export async function createDsaiCheckout() {
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

export async function hasDsaiPurchase(userId: string) {
  const { data, error } = await supabase.from("purchases").select("id").eq("user_id", userId).eq("product_id", "dsai101").eq("status", "paid").maybeSingle()
  if (error) throw error
  return Boolean(data)
}
