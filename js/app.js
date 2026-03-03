const ASSETS = {
  logo: "./assets/img/logo.webp",
  veggiesTop: "./assets/img/veggies-top.png",
  hero: "./assets/img/hero-food-drinks.png",
  flagNl: "./assets/img/flag-nl.png",
  flagEn: "./assets/img/flag-en.png",
  iconHome: "./assets/img/icon-home.png",
  iconCart: "./assets/img/icon-cart.png",
  iconCoffee: "./assets/img/icon-coffee.png",
  iconSamosa: "./assets/img/icon-samosa.png",
};

const i18n = {
  nl: {
    eatHere: "HIER ETEN",
    takeHome: "MEENEMEN",
    nederlands: "NEDERLANDS",
    english: "ENGLISH",
    productsTitle: "burgers",
    productsHeader: "Producten",
    cartTitle: (n) => `${n} items in winkelwagen`,
    total: "Totaal:",
    euro: "EURO:",
    checkout: "Afrekenen",
    backHome: "Terug naar start",
    orderDone: "bestelling voltooid",
    enjoy: "Geniet ervan",
    continue: "Verder",
    emptyCart: "Je winkelwagen is leeg.",
    addAria: (name) => `Voeg ${name} toe`,
    homeAria: "Home",
    cartAria: "Winkelwagen",
    minAria: "Min",
    plusAria: "Plus",
    removeAria: "Verwijder",
  },
  en: {
    eatHere: "EAT HERE",
    takeHome: "TAKE HOME",
    nederlands: "NEDERLANDS",
    english: "ENGLISH",
    productsTitle: "burgers",
    productsHeader: "Products",
    cartTitle: (n) => `${n} items in cart`,
    total: "Total:",
    euro: "EURO:",
    checkout: "Checkout",
    backHome: "Back to start",
    orderDone: "order completed",
    enjoy: "Enjoy!",
    continue: "Continue",
    emptyCart: "Your cart is empty.",
    addAria: (name) => `Add ${name}`,
    homeAria: "Home",
    cartAria: "Cart",
    minAria: "Minus",
    plusAria: "Plus",
    removeAria: "Remove",
  },
};

let CATEGORIES = [];
let PRODUCTS = [];

const STORAGE_KEY = "hh-kiosk-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function formatEuro(cents) {
  const eur = (cents / 100).toFixed(2).replace(".", ",");
  return `€${eur}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

function mapCategoryFromApi(apiCat) {
  const name = apiCat.name || "";
  const key = String(apiCat.category_id);

  let icon = ASSETS.iconSamosa;
  const lower = name.toLowerCase();
  if (lower.includes("drink") || lower.includes("drank")) icon = ASSETS.iconCoffee;

  return {
    id: key,
    label: { nl: name, en: name },
    icon,
  };
}

function mapProductFromApi(apiProd) {
  const id = String(apiProd.product_id);
  const categoryId = String(apiProd.category_id);
  const name = apiProd.name || "";
  const desc = apiProd.description || "";
  const price = Number(apiProd.price ?? 0);
  const priceCents = Math.round(price * 100);

  let icon = ASSETS.iconSamosa;
  const lower = name.toLowerCase();
  if (lower.includes("drink") || lower.includes("juice") || lower.includes("coffee")) {
    icon = ASSETS.iconCoffee;
  }

  return {
    id,
    categoryId,
    name: { nl: name, en: name },
    desc: { nl: desc, en: desc },
    priceCents,
    image: icon,
  };
}

async function ensureDataLoaded() {
  if (state.dataLoaded) return;
  try {
    const [catsApi, prodsApi] = await Promise.all([
      fetchJson("./api/categories.php"),
      fetchJson("./api/products.php"),
    ]);

    CATEGORIES = Array.isArray(catsApi) ? catsApi.map(mapCategoryFromApi) : [];
    PRODUCTS = Array.isArray(prodsApi) ? prodsApi.map(mapProductFromApi) : [];

    if (!CATEGORIES.length) {
      CATEGORIES = [
        { id: "1", label: { nl: "Burgers", en: "Burgers" }, icon: ASSETS.iconSamosa },
      ];
    }
    if (!PRODUCTS.length) {
      PRODUCTS = [
        {
          id: "1",
          categoryId: CATEGORIES[0].id,
          name: { nl: "Voorbeeld product", en: "Example product" },
          desc: {
            nl: "Fallback product omdat de API leeg is.",
            en: "Fallback product because the API returned no data.",
          },
          priceCents: 350,
          image: ASSETS.iconSamosa,
        },
      ];
    }

    // If current categoryId is not valid, default to first category
    if (!state.categoryId || !CATEGORIES.some((c) => c.id === state.categoryId)) {
      state.categoryId = CATEGORIES.length ? CATEGORIES[0].id : null;
    }

    state.dataLoaded = true;
    saveState();

    if (state.screen === "products" || state.screen === "cart") {
      render();
    }
  } catch (e) {
    console.error("Failed to load data from API", e);
  }
}

const initial = loadState();
const state = {
  lang: initial?.lang === "en" ? "en" : "nl",
  // Always start at the start page on reload
  screen: "start",
  mode: initial?.mode ?? null, // 'eatHere' | 'takeHome'
  categoryId: initial?.categoryId ?? null,
  cart: Array.isArray(initial?.cart) ? initial.cart : [],
  lastOrderNo: typeof initial?.lastOrderNo === "number" ? initial.lastOrderNo : null,
  dataLoaded: false,
};

const screenEl = document.getElementById("screen");

function t() {
  return i18n[state.lang];
}

function cartCount() {
  return state.cart.reduce((sum, it) => sum + it.qty, 0);
}

function cartTotalCents() {
  return state.cart.reduce((sum, it) => {
    const p = PRODUCTS.find((x) => x.id === it.productId);
    return sum + (p ? p.priceCents * it.qty : 0);
  }, 0);
}

function setScreen(next) {
  state.screen = next;
  document.documentElement.lang = state.lang;
  render();
  saveState();
}

function setLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  render();
  saveState();
}

function setMode(mode) {
  state.mode = mode;
  ensureDataLoaded().then(() => setScreen("products"));
}

function setCategory(id) {
  state.categoryId = id;
  render();
  saveState();
}

function addToCart(productId) {
  const existing = state.cart.find((x) => x.productId === productId);
  if (existing) existing.qty = clamp(existing.qty + 1, 1, 99);
  else state.cart.push({ productId, qty: 1 });
  render();
  saveState();
}

function setQty(productId, delta) {
  const idx = state.cart.findIndex((x) => x.productId === productId);
  if (idx === -1) return;
  const next = state.cart[idx].qty + delta;
  if (next <= 0) state.cart.splice(idx, 1);
  else state.cart[idx].qty = clamp(next, 1, 99);
  render();
  saveState();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((x) => x.productId !== productId);
  render();
  saveState();
}

async function checkout() {
  const itemsPayload = state.cart.map((it) => ({
    productId: it.productId,
    qty: it.qty,
  }));

  let usedApi = false;
  try {
    const res = await fetch("./api/orders.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsPayload,
        mode: state.mode,
        lang: state.lang,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.pickup_number === "number") {
        state.lastOrderNo = data.pickup_number;
        usedApi = true;
      }
    }
  } catch (e) {
    console.error("Failed to send order to API", e);
  }

  if (!usedApi) {
    const base = Number(localStorage.getItem("hh-kiosk-order-no") ?? "18");
    const next = base + 1;
    localStorage.setItem("hh-kiosk-order-no", String(next));
    state.lastOrderNo = next;
  }

  state.cart = [];
  setScreen("thanks");
}

function el(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

function renderStart() {
  const ui = t();
  return `
    <div class="screen__bg bg-start"></div>
    <div class="veggies" aria-hidden="true"></div>
    <div class="screen__content">
      <div class="brand">
        <div class="brand__bubble">
          <img class="brand__logo" src="${ASSETS.logo}" alt="Happy Herbivore" />
        </div>
      </div>

      <div class="hero" aria-hidden="true">
        <img src="${ASSETS.hero}" alt="" />
      </div>

      <div class="pillRow">
        <button class="btn btn--green" data-action="mode" data-mode="eatHere">${ui.eatHere}</button>
        <button class="btn btn--green" data-action="mode" data-mode="takeHome">${ui.takeHome}</button>
      </div>

      <div class="langRow" aria-label="Taal kiezen">
        <button class="langBtn" data-action="lang" data-lang="nl" aria-pressed="${
          state.lang === "nl"
        }">
          <img src="${ASSETS.flagNl}" alt="" />
          <span>${ui.nederlands}</span>
        </button>
        <button class="langBtn" data-action="lang" data-lang="en" aria-pressed="${
          state.lang === "en"
        }">
          <img src="${ASSETS.flagEn}" alt="" />
          <span>${ui.english}</span>
        </button>
      </div>
    </div>
  `;
}

function renderProducts() {
  const ui = t();
  const products = PRODUCTS.filter((p) => p.categoryId === state.categoryId);
  const cards = products
    .map(
      (p) => `
      <div class="card">
        <img class="card__img" src="${p.image}" alt="" />
        <div class="card__title">${p.name[state.lang]}</div>
        <div class="card__desc">${p.desc[state.lang]}</div>
        <div class="card__meta">
          <div class="card__price">${formatEuro(p.priceCents)}</div>
          <button class="circleBtn" data-action="add" data-product-id="${
            p.id
          }" aria-label="${ui.addAria(p.name[state.lang])}">+</button>
        </div>
      </div>
    `
    )
    .join("");

  const cats = CATEGORIES.map(
    (c) => `
    <button class="catBtn" data-action="cat" data-cat-id="${c.id}" aria-pressed="${
      c.id === state.categoryId
    }">
      <img src="${c.icon}" alt="" />
      <span>${c.label[state.lang]}</span>
    </button>
  `
  ).join("");

  const count = cartCount();
  return `
    <div class="screen__bg bg-products"></div>
    <div class="screen__content screen__content--flush">
      <div class="topBar" aria-label="${ui.productsHeader}">
        <img class="topBar__logo" src="${ASSETS.logo}" alt="Happy Herbivore" />
        <div class="titlePill">${ui.productsTitle}</div>
        ${renderLangMini()}
      </div>

      <div class="layoutProducts">
        <div class="cats">${cats}</div>
        <div class="productsArea scrollArea" aria-label="Productenlijst">
          <div class="grid">${cards}</div>
        </div>
      </div>

      ${renderBottomNav(count)}
    </div>
  `;
}

function renderLangMini() {
  return `
    <div class="langMini" aria-label="Taal">
      <button class="langMiniBtn" data-action="lang" data-lang="nl" aria-pressed="${
        state.lang === "nl"
      }">
        <img src="${ASSETS.flagNl}" alt="NL" />
      </button>
      <button class="langMiniBtn" data-action="lang" data-lang="en" aria-pressed="${
        state.lang === "en"
      }">
        <img src="${ASSETS.flagEn}" alt="EN" />
      </button>
    </div>
  `;
}

function renderBottomNav(count) {
  const ui = t();
  return `
    <div class="bottomNav" aria-label="Navigatie">
      <button class="navBtn" data-action="home" aria-label="${ui.homeAria}">
        <img src="${ASSETS.iconHome}" alt="" />
      </button>
      <button class="navBtn" data-action="gotoCart" aria-label="${ui.cartAria}">
        <img src="${ASSETS.iconCart}" alt="" />
        ${count > 0 ? `<span class="badge">${count}</span>` : ""}
      </button>
    </div>
  `;
}

function renderCart() {
  const ui = t();
  const count = cartCount();
  const items =
    state.cart.length === 0
      ? `<div class="mutedSmall" style="text-align:center; padding: 40px 18px 0;">${ui.emptyCart}</div>`
      : state.cart
          .map((it) => {
            const p = PRODUCTS.find((x) => x.id === it.productId);
            if (!p) return "";
            return `
              <div class="cartItem">
                <img class="cartItem__img" src="${p.image}" alt="" />
                <div>
                  <p class="cartItem__name">${p.name[state.lang]}</p>
                  <p class="cartItem__price">${formatEuro(p.priceCents)}</p>
                  <div class="qty" aria-label="Aantal">
                    <button class="circleBtn" data-action="qty" data-product-id="${
                      p.id
                    }" data-delta="-1" aria-label="${ui.minAria}">-</button>
                    <div class="qty__num">${it.qty}</div>
                    <button class="circleBtn" data-action="qty" data-product-id="${
                      p.id
                    }" data-delta="1" aria-label="${ui.plusAria}">+</button>
                    <button class="removeBtn" data-action="remove" data-product-id="${
                      p.id
                    }" aria-label="${ui.removeAria}">×</button>
                  </div>
                </div>
                <div style="font-weight:900;">${formatEuro(p.priceCents * it.qty)}</div>
              </div>
            `;
          })
          .join("");

  return `
    <div class="screen__bg bg-cart"></div>
    <div class="screen__content screen__content--flush">
      <div class="cartHeader">
        <img class="topBar__logo" src="${ASSETS.logo}" alt="Happy Herbivore" />
        <div class="cartHeader__title">${ui.cartTitle(count)}</div>
        ${renderLangMini()}
      </div>

      <div class="scrollArea cartMain">
        <div class="cartList">${items}</div>

        <div class="totalRow">
          <div>${ui.total}</div>
          <div class="mutedSmall">${ui.euro}</div>
          <div>${formatEuro(cartTotalCents())}</div>
        </div>

        <div class="actions">
          <button class="btn btn--purple" data-action="checkout" ${
            count === 0 ? "disabled" : ""
          }>${ui.checkout}</button>
          <button class="btn btn--orange" data-action="home">${ui.backHome}</button>
        </div>
      </div>

      ${renderBottomNav(count)}
    </div>
  `;
}

function renderThanks() {
  const ui = t();
  const no = state.lastOrderNo ?? 19;
  return `
    <div class="screen__bg bg-thanks"></div>
    <div class="screen__content">
      <div class="thanksWrap">
        <img class="topBar__logo" src="${ASSETS.logo}" alt="Happy Herbivore" style="width:90px;" />
        <div class="checkBubble">✓</div>
        <div class="thanksText">
          <h2>${ui.orderDone}</h2>
          <p>${ui.enjoy}</p>
        </div>
        <div class="orderNo" aria-label="Ordernummer">${no}</div>
        <button class="btn btnWide" style="background: rgba(255,255,255,0.75); color: var(--darkBlue);" data-action="continue">${
          ui.continue
        }</button>
      </div>
    </div>
  `;
}

function render() {
  let html = "";
  switch (state.screen) {
    case "start":
      html = renderStart();
      break;
    case "products":
      html = renderProducts();
      break;
    case "cart":
      html = renderCart();
      break;
    case "thanks":
      html = renderThanks();
      break;
    default:
      html = renderStart();
  }
  screenEl.innerHTML = html;
}

screenEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  if (action === "lang") return setLang(btn.dataset.lang);
  if (action === "mode") return setMode(btn.dataset.mode);
  if (action === "home") return setScreen("start");
  if (action === "gotoCart") return setScreen("cart");
  if (action === "cat") return setCategory(btn.dataset.catId);
  if (action === "add") return addToCart(btn.dataset.productId);
  if (action === "qty") return setQty(btn.dataset.productId, Number(btn.dataset.delta));
  if (action === "remove") return removeFromCart(btn.dataset.productId);
  if (action === "checkout") return checkout();
  if (action === "continue") return setScreen("start");
});

// Initial render
render();
saveState();

