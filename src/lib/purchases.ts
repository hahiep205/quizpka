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
  if (subjectCode === "FIN101") return "fin101"
  if (subjectCode === "CIV101") return "civ101"
  if (subjectCode === "ECO101") return "eco101"
  if (subjectCode === "LAW101") return "law101"
  if (subjectCode === "HCM101") return "hcm101"
  if (subjectCode === "MGT101") return "mgt101"
  if (subjectCode === "PHY101") return "phy101"
  if (subjectCode === "PPT101") return "ppt101"
  if (subjectCode === "PPT102") return "ppt102"
  if (subjectCode === "GT101") return "gt101"
  if (subjectCode === "DST101") return "dst101"
  if (subjectCode === "XST101") return "xst101"
  if (subjectCode === "MLN102") return "mln102"
  if (subjectCode === "PEC101") return "pec101"
  if (subjectCode === "MLN101") return "mln101"
  
  if (subjectCode === "HIS101") return "his101"
  if (subjectCode === "SOC101") return "soc101"
  if (subjectCode === "DM101") return "dm101"
  if (subjectCode === "TA101") return "ta101"
  if (subjectCode === "RM101") return "rm101"
  if (subjectCode === "RM102") return "rm102"
  if (subjectCode === "TADV02") return "tadv02"
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

const PRODUCT_PRICES_VND: Record<string, number> = {
  tadv02: 20000,
}

export function getProductPriceVnd(productId: string): number {
  return PRODUCT_PRICES_VND[productId] ?? 10000
}

export function formatProductPrice(productId: string): string {
  return `${new Intl.NumberFormat("vi-VN").format(getProductPriceVnd(productId))} VND`
}

/** Display price for a subject card CTA, or null when the subject is free. */
export function formatSubjectPrice(subjectCode: string): string | null {
  const productId = getPaidProductId(subjectCode)
  return productId === null ? null : formatProductPrice(productId)
}

export async function hasProductPurchase(userId: string, productId: string) {
  const { data, error } = await supabase.from("purchases").select("id").eq("user_id", userId).eq("product_id", productId).eq("status", "paid").maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export const hasDsaiPurchase = (userId: string) => hasProductPurchase(userId, "dsai101")
