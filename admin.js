(function () {
  const C = window.SITE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const flash = (el, ok, text) => { el.className = "msg " + (ok ? "ok" : "err"); el.textContent = text; };
  const configured = C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase;

  if (!configured) {
    document.getElementById("login").innerHTML = '<p class="center muted">The admin is not connected yet. Add the SOULWEAR Supabase URL and key to config.js.</p>';
    return;
  }
  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  let products = [];

  // ---------- Login ----------
  async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return showLogin();
    const { data } = await db.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (!data) {
      await db.auth.signOut();
      flash($("login-msg"), false, "This account is not an admin.");
      return showLogin();
    }
    $("login").classList.add("hidden");
    $("dash").classList.remove("hidden");
    loadProducts();
  }
  function showLogin() { $("login").classList.remove("hidden"); $("dash").classList.add("hidden"); }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: $("l-email").value.trim(), password: $("l-pass").value });
    if (error) return flash($("login-msg"), false, "Incorrect email or password.");
    $("l-pass").value = "";
    checkSession();
  });
  $("logout").addEventListener("click", async () => { await db.auth.signOut(); showLogin(); });

  // ---------- Photos: shrink in the browser, then upload ----------
  function shrink(file, maxSide = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that photo"))), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that photo")); };
      img.src = url;
    });
  }
  async function uploadPhoto(productId, file) {
    const blob = await shrink(file);
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await db.storage.from("products").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw error;
    return db.storage.from("products").getPublicUrl(path).data.publicUrl;
  }

  // ---------- Colour rows ----------
  function variantRow(v = {}) {
    const row = document.createElement("div");
    row.className = "variant";
    row.innerHTML = `
      <div>${v.image ? `<img src="${esc(v.image)}" alt="">` : `<div class="muted small">No photo</div>`}</div>
      <div></div>
      <div>
        <label>Colour name</label><input class="v-colour" value="${esc(v.colour || "")}" maxlength="30" required>
        <label>Photo <span class="muted small">${v.image ? "(choose a file only to replace it)" : ""}</span></label>
        <input class="v-file" type="file" accept="image/*" ${v.image ? "" : "required"}>
        <input type="hidden" class="v-image" value="${esc(v.image || "")}">
      </div>
      <button type="button" class="rm">Remove</button>`;
    row.querySelector(".rm").addEventListener("click", () => row.remove());
    $("variants").appendChild(row);
  }
  $("add-variant").addEventListener("click", () => variantRow());

  // ---------- Product list ----------
  async function loadProducts() {
    const { data, error } = await db.from("products").select("*").order("sort").order("created_at");
    if (error) { $("products-body").innerHTML = `<tr><td colspan="6">Could not load products: ${esc(error.message)}</td></tr>`; return; }
    products = data || [];
    if (!products.length) { $("products-body").innerHTML = `<tr><td colspan="6">No products yet. Tap "Add product".</td></tr>`; return; }
    const cat = { hoodies: "Hoodies", tshirts: "T-shirts", jerseys: "Jerseys" };
    $("products-body").innerHTML = products.map((p) => {
      const thumb = (p.variants && p.variants[0] && p.variants[0].image) || "";
      return `<tr>
        <td><div style="display:flex;gap:12px;align-items:center">${thumb ? `<img class="thumbs" src="${esc(thumb)}" alt="">` : ""}<div><strong>${esc(p.name)}</strong><br><small class="muted">${(p.variants || []).length} colour(s)</small></div></div></td>
        <td>${esc(cat[p.category] || p.category)}</td>
        <td>${p.price == null ? "On WhatsApp" : "KES " + Number(p.price).toLocaleString()}</td>
        <td>${p.stock == null ? "Not set" : p.stock}</td>
        <td>${p.active ? "Yes" : "No"}</td>
        <td><div class="actions">
          <button class="btn small ghost" data-edit="${esc(p.id)}">Edit</button>
          <button class="btn small ghost" data-toggle="${esc(p.id)}">${p.active ? "Hide" : "Show"}</button>
          <button class="btn small danger" data-del="${esc(p.id)}">Delete</button>
        </div></td>
      </tr>`;
    }).join("");
  }

  $("products-body").addEventListener("click", async (e) => {
    const t = e.target;
    try {
      if (t.dataset.edit) openForm(products.find((p) => p.id === t.dataset.edit));
      else if (t.dataset.toggle) {
        const p = products.find((x) => x.id === t.dataset.toggle);
        await db.from("products").update({ active: !p.active }).eq("id", p.id);
        loadProducts();
      } else if (t.dataset.del) {
        const p = products.find((x) => x.id === t.dataset.del);
        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
          await db.from("products").delete().eq("id", p.id);
          loadProducts();
        }
      }
    } catch (err) { alert(err.message); }
  });

  // ---------- Add / edit form ----------
  function openForm(p) {
    $("product-form").reset();
    $("variants").innerHTML = "";
    $("pf-msg").className = "msg";
    if (p) {
      $("pf-title").textContent = "Edit product";
      $("pf-id").value = p.id;
      $("pf-name").value = p.name;
      $("pf-category").value = p.category;
      $("pf-desc").value = p.description || "";
      $("pf-price").value = p.price ?? "";
      $("pf-stock").value = p.stock ?? "";
      $("pf-sizes").value = (p.sizes || []).join(", ");
      $("pf-sort").value = p.sort ?? 0;
      $("pf-active").checked = !!p.active;
      (p.variants || []).forEach((v) => variantRow(v));
    } else {
      $("pf-title").textContent = "Add product";
      $("pf-id").value = "";
      $("pf-sizes").value = C.sizes.join(", ");
      $("pf-active").checked = true;
      variantRow();
    }
    $("product-form").classList.remove("hidden");
    $("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("new-product").addEventListener("click", () => openForm(null));
  $("pf-cancel").addEventListener("click", () => $("product-form").classList.add("hidden"));

  $("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("pf-msg");
    const btn = $("pf-save");
    btn.disabled = true;
    msg.className = "msg";
    try {
      const rows = [...$("variants").querySelectorAll(".variant")];
      if (!rows.length) throw new Error("Add at least one colour with a photo.");

      let id = $("pf-id").value;
      const priceRaw = $("pf-price").value.trim();
      const stockRaw = $("pf-stock").value.trim();
      const row = {
        category: $("pf-category").value,
        name: $("pf-name").value.trim(),
        description: $("pf-desc").value.trim(),
        price: priceRaw === "" ? null : Number(priceRaw),
        stock: stockRaw === "" ? null : parseInt(stockRaw, 10),
        sizes: $("pf-sizes").value.split(",").map((s) => s.trim()).filter(Boolean),
        sort: parseInt($("pf-sort").value || "0", 10),
        active: $("pf-active").checked,
      };
      if (row.price !== null && (isNaN(row.price) || row.price < 0)) throw new Error("Enter a valid price.");
      if (row.stock !== null && (isNaN(row.stock) || row.stock < 0)) throw new Error("Enter a valid stock number.");

      // New product first, so its photos get a folder with its id
      if (!id) {
        const { data, error } = await db.from("products").insert({ ...row, variants: [] }).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      const variants = [];
      for (const r of rows) {
        const colour = r.querySelector(".v-colour").value.trim();
        const file = r.querySelector(".v-file").files[0];
        let image = r.querySelector(".v-image").value;
        if (file) {
          msg.className = "msg ok";
          msg.textContent = `Uploading ${colour} photo...`;
          image = await uploadPhoto(id, file);
        }
        if (!colour || !image) throw new Error("Each colour needs a name and a photo.");
        variants.push({ colour, image });
      }

      const { error } = await db.from("products").update({ ...row, variants }).eq("id", id);
      if (error) throw error;

      flash(msg, true, "Saved. The website shows the change within a minute.");
      loadProducts();
      setTimeout(() => $("product-form").classList.add("hidden"), 900);
    } catch (err) {
      flash(msg, false, err.message || "Could not save. Please try again.");
    } finally {
      btn.disabled = false;
    }
  });

  checkSession();
})();
