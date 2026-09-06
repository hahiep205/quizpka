import { supabase } from "@/lib/supabase"

export type AdminProduct = { id: string; name: string; priceVnd: number }

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase.from("products").select("id,name,price_vnd").eq("active", true).order("name")
  if (error) throw new Error(`Không đọc được danh sách môn học: ${error.message}`)
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, priceVnd: Number(row.price_vnd) || 0 }))
}

export async function grantAdminPurchase(input: { userId: string; productId: string }): Promise<{ alreadyGranted: boolean }> {
  const { data, error } = await supabase.rpc("admin_grant_purchase", { p_user_id: input.userId, p_product_id: input.productId })
  if (error) throw new Error(`Không thể cấp quyền: ${error.message}`)
  const result = data as { already_granted?: boolean } | null
  return { alreadyGranted: result?.already_granted === true }
}
