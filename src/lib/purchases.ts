import { supabase } from "@/lib/supabase"

export async function createDsaiCheckout() {
  const { data, error } = await supabase.functions.invoke("create-sepay-checkout")
  if (error) throw error
  return data as { owned: boolean; orderId?: string; checkoutUrl?: string; fields?: Record<string, string | number> }
}

export async function hasDsaiPurchase(userId: string) {
  const { data, error } = await supabase.from("purchases").select("id").eq("user_id", userId).eq("product_id", "dsai101").eq("status", "paid").maybeSingle()
  if (error) throw error
  return Boolean(data)
}
