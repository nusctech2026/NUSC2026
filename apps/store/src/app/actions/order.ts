"use server";

import { createServerClient } from "@nusc/db";
import { revalidatePath } from "next/cache";

export async function createOrder(
  idempotencyKey: string,
  items: { variant_id: string; quantity: number }[],
  shippingAddress: any,
  couponCode?: string
) {
  const supabase = await createServerClient();
  
  // Need to ensure the user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in to checkout" };
  }

  // The database schema expects us to call the create_order RPC
  // create_order(
  //   p_idempotency_key UUID,
  //   p_user_id UUID,
  //   p_items JSONB,
  //   p_shipping_address JSONB,
  //   p_coupon_code TEXT DEFAULT NULL
  // )

  const { data: order, error } = await supabase.rpc('create_order', {
    p_idempotency_key: idempotencyKey,
    p_user_id: user.id,
    p_items: items,
    p_shipping_address: shippingAddress,
    p_coupon_code: couponCode || null
  });

  if (error) {
    console.error("Order creation error:", error);
    return { error: error.message };
  }

  return { success: true, orderId: order.id };
}
