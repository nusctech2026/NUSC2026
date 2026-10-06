const { Client } = require('pg');

async function test() {
  const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query(`select "id", "product_id", "storage_path", "alt_text", "display_order", "prefix", "_objectkey", "updated_at", "created_at", "url", "thumbnail_u_r_l", "filename", "mime_type", "filesize", "width", "height", "focal_x", "focal_y", "sizes_default_url", "sizes_default_width", "sizes_default_height", "sizes_default_mime_type", "sizes_default_filesize", "sizes_default_filename" from "product_images" "product_images" order by "product_images"."created_at" desc limit 10`);
    console.log("SUCCESS");
  } catch(e) {
    console.error("ERROR:", e.message);
  } finally {
    await client.end();
  }
}
test();
