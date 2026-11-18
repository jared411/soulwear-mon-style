# SOULWEAR MON STYLE website

Static site on Vercel, with a private admin page for adding and editing products. No database is needed: products are kept in `products.json` in this repo, and photos are kept in `assets/products`.

## Files
- `index.html`, `styles.css`, `app.js`: the public website
- `config.js`: brand text, WhatsApp numbers, social links
- `products.json`: the products shown on the shop (the admin page edits this file)
- `admin.html`, `admin.js`, `admin.css`: the admin page (`/admin.html`)
- `api/`: small Vercel functions that check the admin password and save changes to this repo

## Setup (once)

### 1. Put the site on Vercel
1. In Vercel, choose **Add New → Project**, and import **soulwear-mon-style**.
2. Framework preset: **Other**. Leave the build command empty and keep the root folder.
3. Deploy.

### 2. Create a GitHub access token
1. On GitHub, go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Repository access: **Only select repositories**, and choose **soulwear-mon-style**.
3. Permissions: **Contents → Read and write**.
4. Generate it and copy the token (it starts with `github_pat_`). Keep it private.

### 3. Add the settings in Vercel
In the project, go to **Settings → Environment Variables** and add:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password you'll use to log in to the admin (make it long) |
| `SESSION_SECRET` | any random text of 32 or more characters |
| `GITHUB_TOKEN` | the token from step 2 |
| `GITHUB_REPO` | `jared411/soulwear-mon-style` |
| `GITHUB_BRANCH` | `main` |

Then go to **Deployments** and redeploy the latest one so the settings apply.

### 4. Log in
Open `https://YOUR-SITE.vercel.app/admin.html` and sign in with `ADMIN_PASSWORD`.

## Using the admin
- **Add product:** tap **Add product**, fill in the details, and add one colour per photo. Leave the price empty to show "Price on WhatsApp", and leave the stock empty to show "Check availability".
- **Edit:** tap **Edit**. Choose a new photo only if you want to replace one.
- **Hide / Show:** hides a product from the shop without deleting it.
- **Delete:** removes the product from the shop. Its photos stay in the repo.

Each save makes a commit in GitHub and Vercel updates the site within a minute or two. Keep photos to a few megabytes, and use a few good photos rather than hundreds.

## Notes
- Anyone with the admin password can change products, so choose a strong one and don't share it.
- Logging out or closing the browser ends the session after 12 hours.
- If you change the GitHub token, update `GITHUB_TOKEN` in Vercel and redeploy.
