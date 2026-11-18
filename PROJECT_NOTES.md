# SOULWEAR MON STYLE: project notes

## Links
- Repo: https://github.com/jared411/soulwear-mon-style
- Vercel: not connected yet by the owner (framework "Other", no build command, root folder)

## Brand
- Business: SOULWEAR MON STYLE. Brand: SOULWEAR (no space in the logo).
- Slogan: YOU GOT IT WE GOT IT (no comma)
- Heritage: EST.21
- Logo: the S crest with crown and SOULWEAR wordmark (from the image the owner sent, black backdrop removed).
- Colours: black background, metallic gold, white text.

## Contact
- WhatsApp ordering: 0707 073 011 and 0797 770 150 (both open order links)

## Where things are
- config.js: brand text, WhatsApp numbers, social links (blank = hidden)
- products.json: products, prices, sizes, stock, colour photos (price and stock null = "Price on WhatsApp")
- index.html, styles.css, app.js: the site

## Still needed from the owner
- Prices, stock and sizes for each hoodie
- T-shirt and jersey photos and details
- Social media handles
- Real about-us story (current text is a draft from the brief)
- Confirm the logo file is the final one (the brief originally named the M shield from the jersey; the owner chose the S crest)

## Done
- Site built and pushed (home, shop, collections, about, identity, WhatsApp orders, social)
- Hoodie photos from the supplied image (brown, white, grey)

## Admin portal (added)
- admin.html: private product manager (add, edit, hide, delete, upload photos per colour).
- Products are stored in a separate Supabase project for SOULWEAR (not Bremoh's). Schema: supabase/schema.sql.
- Setup needed: create the SOULWEAR Supabase project, run schema.sql, create the admin user, add its id to admins, then put URL and anon key in config.js.
- Until then the site shows products from products.json and the admin says it is not connected.
