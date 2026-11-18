(function () {
  const C = window.SITE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const flash = (el, ok, text) => { el.className = "msg " + (ok ? "ok" : "err"); el.textContent = text; };

  let products = [];
  let meta = { currency: "KES", sizes: C.sizes };

  // Small wrapper around the admin API
  async function api(path, options = {}) {
    const opts = { credentials: "same-origin", ...options };
    if (opts.body && typeof opts.body !== "string") {
      opts.body = JSON.stringify(opts.body);
      opts.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    }
    const res = await fetch("/api/" + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || "Something went wrong");
      err.status = res.status;
      throw err;
    }
    return data;
  }
  // Any call that comes back "not signed in" returns you to the login screen
  async function call(path, options) {
    try { return await api(path, options); }
    catch (err) { if (err.status === 401) showLogin(); throw err; }
  }

  // ---------- Login ----------
  async function checkSession() {
    try { await api("me"); }
    catch (e) { return showLogin(); }
    $("login").classList.add("hidden");
    $("dash").classList.remove("hidden");
    loadProducts();
  }
  function showLogin() { $("login").classList.remove("hidden"); $("dash").classList.add("hidden"); }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("login", { method: "POST", body: { password: $("l-pass").value } });
      $("l-pass").value = "";
      $("login-msg").className = "msg";
      checkSession();
    } catch (err) { flash($("login-msg"), false, err.message); }
  });
  $("logout").addEventListener("click", async () => {
    try { await api("logout", { method: "POST", body: {} }); } catch (e) {}
    showLogin();
  });

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
        resolve(c.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that photo. Try a JPG or PNG.")); };
      img.src = url;
    });
  }
  async function uploadPhoto(productId, file) {
    const data = await shrink(file);
    const res = await call("upload", { method: "POST", body: { productId, data } });
    return res.path;
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

  // ---------- Save the whole list ----------
  async function saveList(list) {
    await call("products", { method: "PUT", body: { products: list } });
    products = list;
  }

  // ---------- Product list ----------
  async function loadProducts() {
    try {
      const data = await call("products");
      products = data.products || [];
      meta = { currency: data.currency || "KES", sizes: data.sizes || C.sizes };
    } catch (err) {
      $("products-body").innerHTML = `<tr><td colspan="6">Could not load products: ${esc(err.message)}</td></tr>`;
      return;
    }
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
        const next = products.map((p) => (p.id === t.dataset.toggle ? { ...p, active: !p.active } : p));
        await saveList(next);
        loadProducts();
      } else if (t.dataset.del) {
        const p = products.find((x) => x.id === t.dataset.del);
        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
          await saveList(products.filter((x) => x.id !== p.id));
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
      $("pf-sizes").value = (meta.sizes || C.sizes).join(", ");
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

      const priceRaw = $("pf-price").value.trim();
      const stockRaw = $("pf-stock").value.trim();
      const price = priceRaw === "" ? null : Number(priceRaw);
      const stock = stockRaw === "" ? null : parseInt(stockRaw, 10);
      if (price !== null && (isNaN(price) || price < 0)) throw new Error("Enter a valid price.");
      if (stock !== null && (isNaN(stock) || stock < 0)) throw new Error("Enter a valid stock number.");

      const id = $("pf-id").value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      const variants = [];
      for (const r of rows) {
        const colour = r.querySelector(".v-colour").value.trim();
        const file = r.querySelector(".v-file").files[0];
        let image = r.querySelector(".v-image").value;
        if (file) {
          msg.className = "msg ok";
          msg.textContent = `Uploading ${colour || "colour"} photo...`;
          image = await uploadPhoto(id, file);
        }
        if (!colour || !image) throw new Error("Each colour needs a name and a photo.");
        variants.push({ colour, image });
      }

      const product = {
        id,
        category: $("pf-category").value,
        name: $("pf-name").value.trim(),
        description: $("pf-desc").value.trim(),
        price,
        stock,
        sizes: $("pf-sizes").value.split(",").map((s) => s.trim()).filter(Boolean),
        variants,
        active: $("pf-active").checked,
        sort: parseInt($("pf-sort").value || "0", 10),
      };
      const exists = products.some((p) => p.id === id);
      const next = exists ? products.map((p) => (p.id === id ? product : p)) : [...products, product];
      await saveList(next);

      flash(msg, true, "Saved. The website updates in about a minute.");
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
