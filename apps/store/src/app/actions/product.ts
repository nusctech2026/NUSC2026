"use server";

import { createServerClient } from "@nusc/db";

export async function getProductById(id: string) {
  const supabase = await createServerClient();
  
  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images ( storage_path, display_order ),
      product_variants ( id, sku, size, color, stock_quantity )
    `)
    .eq("id", id)
    .single();

  if (error || !product) {
    console.error("Error fetching product:", error);
    return null;
  }

  // Ensure images are sorted
  const sortedImages = product.product_images
    ? product.product_images.sort((a: any, b: any) => a.display_order - b.display_order)
    : [];

  const mainImage = sortedImages.length > 0 
    ? (sortedImages[0].storage_path.startsWith('/') ? sortedImages[0].storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product_images/${sortedImages[0].storage_path}`)
    : null;
    
  const gallery = sortedImages.slice(1).map((img: any) => 
    img.storage_path.startsWith('/') ? img.storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product_images/${img.storage_path}`
  );

  // Parse variants
  const variants = product.product_variants || [];

  return {
    id: product.id,
    name: product.name,
    code: product.slug || product.id.slice(0, 8),
    price: `₹ ${(product.price / 100).toLocaleString('en-IN')}`,
    rawPrice: product.price,
    originalPrice: null, // implement if needed
    image: mainImage,
    gallery,
    description: product.description,
    sizes: variants.map((v: any) => ({
      id: v.id,
      label: v.size || "Default",
      status: v.stock_quantity > 0 ? "available" : "sold-out",
      stock: v.stock_quantity,
      sku: v.sku
    })).sort((a: any, b: any) => {
       // Sort sizes logically if possible, here simple sort
       const sizeOrder: Record<string, number> = { "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6, "XXXL": 7 };
       return (sizeOrder[a.label] || 99) - (sizeOrder[b.label] || 99);
    })
  };
}
