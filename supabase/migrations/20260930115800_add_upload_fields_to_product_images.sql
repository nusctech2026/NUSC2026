ALTER TABLE public.product_images
ADD COLUMN url varchar,
ADD COLUMN filename varchar,
ADD COLUMN mime_type varchar,
ADD COLUMN filesize numeric,
ADD COLUMN width numeric,
ADD COLUMN height numeric,
ADD COLUMN focal_x numeric,
ADD COLUMN focal_y numeric;
