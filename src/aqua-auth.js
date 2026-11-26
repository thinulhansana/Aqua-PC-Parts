import firebaseConfig from "../firebase-applet-config.json";

const FIREBASE_CDN_BASE = "https://www.gstatic.com/firebasejs/11.10.0";
const REDIRECT_STATE_KEY = "aqua-auth-pending-redirect-v1";

let app = null;
let db = null;
let auth = null;
let googleProvider = null;
let facebookProvider = null;
let fbAppCheck = null;
let fbAuth = null;
let fbFirestore = null;
let firebaseInitPromise = null;

function ensureFirebase() {
  if (firebaseInitPromise) return firebaseInitPromise;
  firebaseInitPromise = (async () => {
    const [appMod, appCheckMod, authMod, firestoreMod] = await Promise.all([
      import(FIREBASE_CDN_BASE + "/firebase-app.js"),
      import(FIREBASE_CDN_BASE + "/firebase-app-check.js"),
      import(FIREBASE_CDN_BASE + "/firebase-auth.js"),
      import(FIREBASE_CDN_BASE + "/firebase-firestore.js"),
    ]);
    fbAppCheck = appCheckMod;
    fbAuth = authMod;
    fbFirestore = firestoreMod;

    app = appMod.initializeApp(firebaseConfig);
    db = firestoreMod.getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = authMod.getAuth(app);

    googleProvider = new authMod.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    facebookProvider = new authMod.FacebookAuthProvider();
    facebookProvider.addScope("email");

    // Process OAuth redirect result if returning from signInWithRedirect fallback
    try {
      const redirectResult = await authMod.getRedirectResult(auth);
      if (redirectResult && redirectResult.user) {
        let savedRedirect = null;
        try {
          savedRedirect = JSON.parse(sessionStorage.getItem(REDIRECT_STATE_KEY) || "null");
          sessionStorage.removeItem(REDIRECT_STATE_KEY);
        } catch (_) {}

        state.user = redirectResult.user;
        await syncUserProfile(redirectResult.user);
        const unlockedPayment = Boolean(savedRedirect && savedRedirect.paymentGate);
        if (unlockedPayment) {
          state.portalTab = "payments";
          state.pendingPaymentRedirect = false;
          state.paymentGateNotice = false;
        }
        state.modalOpen = true;
        state.successMsg = unlockedPayment
          ? "Account verified! Official bank details and the Payment Portal are now unlocked."
          : "Signed in as " + getFirstName(redirectResult.user, state.profile) + "!";
        renderHeaderSlot();
        renderModalContent();
        syncModalVisibility();
        showPageToast("Signed in as " + getFirstName(redirectResult.user, state.profile));
      } else {
        try {
          sessionStorage.removeItem(REDIRECT_STATE_KEY);
        } catch (_) {}
      }
    } catch (redirectErr) {
      let savedRedirect = null;
      try {
        savedRedirect = JSON.parse(sessionStorage.getItem(REDIRECT_STATE_KEY) || "null");
        sessionStorage.removeItem(REDIRECT_STATE_KEY);
      } catch (_) {}
      const label = savedRedirect && savedRedirect.provider === "facebook" ? "Facebook" : "Google";
      state.errorMsg = mapProviderAuthError(redirectErr, label);
      state.modalOpen = true;
      renderModalContent();
      syncModalVisibility();
    }

    authMod.onAuthStateChanged(auth, async (user) => {
      state.ready = true;
      state.user = user || null;
      if (user) {
        await syncUserProfile(user);
        attachQuotesListener(user);
        attachOrdersListener(user);
        attachBankDetailsListener(user);
        attachPaymentsListener(user);
        consumePendingPaymentRedirect();
      } else {
        state.profile = null;
        detachQuotesListener();
        detachOrdersListener();
        detachBankDetailsListener();
        detachPaymentsListener();
      }
      renderHeaderSlot();
      if (state.modalOpen && !state.busy) renderModalContent();
      if (state.trackOpen) renderTrackModal();
    });

    attachInventoryListener();
    return true;
  })().catch((err) => {
    firebaseInitPromise = null;
    console.error("Failed to initialize Firebase SDK:", err);
    throw err;
  });
  return firebaseInitPromise;
}

const initializeAppCheck = (...args) => fbAppCheck.initializeAppCheck(...args);
class ReCaptchaEnterpriseProvider {
  constructor(siteKey) {
    return new fbAppCheck.ReCaptchaEnterpriseProvider(siteKey);
  }
}
const getAppCheckToken = (...args) => fbAppCheck.getToken(...args);
const signInWithPopup = (...args) => fbAuth.signInWithPopup(...args);
const signInWithRedirect = (...args) => fbAuth.signInWithRedirect(...args);
const signInWithEmailAndPassword = (...args) => fbAuth.signInWithEmailAndPassword(...args);
const createUserWithEmailAndPassword = (...args) => fbAuth.createUserWithEmailAndPassword(...args);
const updateProfile = (...args) => fbAuth.updateProfile(...args);
const sendPasswordResetEmail = (...args) => fbAuth.sendPasswordResetEmail(...args);
const sendEmailVerification = (...args) => fbAuth.sendEmailVerification(...args);
const firebaseSignOut = (...args) => fbAuth.signOut(...args);
const doc = (...args) => fbFirestore.doc(...args);
const getDoc = (...args) => fbFirestore.getDoc(...args);
const setDoc = (...args) => fbFirestore.setDoc(...args);
const updateDoc = (...args) => fbFirestore.updateDoc(...args);
const deleteDoc = (...args) => fbFirestore.deleteDoc(...args);
const writeBatch = (...args) => fbFirestore.writeBatch(...args);
const collection = (...args) => fbFirestore.collection(...args);
const query = (...args) => fbFirestore.query(...args);
const where = (...args) => fbFirestore.where(...args);
const onSnapshot = (...args) => fbFirestore.onSnapshot(...args);
const serverTimestamp = (...args) => fbFirestore.serverTimestamp(...args);

let appCheckInstance = null;
let recaptchaInitPromise = null;

async function resolveRecaptchaSiteKey() {
  const fromConfig = String(firebaseConfig.recaptchaSiteKey || "").trim();
  if (fromConfig) return fromConfig;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
  try {
    const res = await fetch("/api/auth-config", {
      cache: "no-store",
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return String((data && data.recaptchaSiteKey) || "").trim();
  } catch (_) {
    return "";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function initRecaptchaEnterprise() {
  if (recaptchaInitPromise) return recaptchaInitPromise;
  recaptchaInitPromise = (async () => {
    const siteKey = await resolveRecaptchaSiteKey();
    if (!siteKey) return false;
    try {
      await ensureFirebase();
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      state.recaptchaActive = true;
      // Avoid wiping typed form inputs if user is already typing inside the login modal
      const activeEl = document.activeElement;
      const modalHost = document.getElementById("aqua-auth-modal");
      const typingInModal = Boolean(
        modalHost && activeEl && modalHost.contains(activeEl) && /^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName)
      );
      if (state.modalOpen && !state.user && !typingInModal) {
        renderModalContent();
      }
      return true;
    } catch (err) {
      console.warn("reCAPTCHA Enterprise App Check initialization skipped:", err && err.message ? err.message : err);
      appCheckInstance = null;
      state.recaptchaActive = false;
      return false;
    }
  })();
  return recaptchaInitPromise;
}

async function ensureRecaptchaVerification() {
  if (recaptchaInitPromise) {
    await Promise.race([
      recaptchaInitPromise.catch(() => false),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  }
  if (!appCheckInstance) return false;
  try {
    await Promise.race([
      getAppCheckToken(appCheckInstance, false),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    return true;
  } catch (err) {
    // Non-blocking fallback: on preview domains or before App Check registration in Firebase Console,
    // log a warning and allow Firebase Auth itself to enforce project-level security instead of hard-blocking login.
    console.warn(
      "reCAPTCHA Enterprise App Check token exchange skipped:",
      err && err.code ? err.code : err && err.message ? err.message : err
    );
    return false;
  }
}

const ADMIN_EMAIL = "thinulhansana0411@gmail.com";

const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser ? auth.currentUser.uid : null,
      email: auth.currentUser ? auth.currentUser.email : null,
      emailVerified: auth.currentUser ? auth.currentUser.emailVerified : null,
      isAnonymous: auth.currentUser ? auth.currentUser.isAnonymous : null,
      tenantId: auth.currentUser ? auth.currentUser.tenantId : null,
      providerInfo:
        auth.currentUser && Array.isArray(auth.currentUser.providerData)
          ? auth.currentUser.providerData.map((provider) => ({
              providerId: provider.providerId,
              email: provider.email,
            }))
          : [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection verified via real-time inventoryOverrides listener upon Firebase SDK load.

// Blueprint validation constants (synchronized with firebase-blueprint.json)
const LIMITS = {
  displayNameMax: 100,
  emailMax: 254,
  photoURLMax: 500,
  phoneMax: 32,
  phonePattern: /^[0-9+\-\s()]*$/,
  cityMax: 80,
  quoteTitleMax: 120,
  quoteSummaryMax: 2000,
  quoteItemMax: 100,
  quoteTotalMax: 100000000,
  orderSummaryMax: 2500,
  orderNoteMax: 240,
  stockNoteMax: 120,
  skuPattern: /^[a-zA-Z0-9_\-]+$/,
  orderNumberPattern: /^[A-Z0-9\-]{5,32}$/,
  validFulfillments: new Set(["pickup", "courier", "install"]),
  validStatuses: ["received", "bench_testing", "packed", "dispatched", "delivered", "cancelled"],
  bankNameMax: 100,
  accountNameMax: 120,
  accountNumberMax: 48,
  accountNumberPattern: /^[A-Za-z0-9\-\s]+$/,
  branchMax: 100,
  swiftCodeMax: 32,
  instructionsMax: 400,
  bankRefMax: 80,
  depositorNameMax: 100,
  transferDateMax: 32,
  paymentNoteMax: 240,
  validPaymentMethods: new Set(["bank_transfer", "online_transfer", "ceft_instant", "cash_deposit"]),
  validPaymentStatuses: ["pending_verification", "verified", "rejected", "cancelled"],
};

const PAYMENT_METHOD_LABELS = {
  bank_transfer: "Direct Bank Transfer",
  online_transfer: "Online Banking Transfer",
  ceft_instant: "CEFT / Instant Fund Transfer",
  cash_deposit: "CDM / Branch Cash Deposit",
};

const PAYMENT_STATUS_LABELS = {
  pending_verification: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const ORDER_STAGES = [
  {
    key: "received",
    label: "Order Received",
    shortLabel: "Received",
    icon: "receipt_long",
    desc: "Logged at our Embilipitiya hardware desk and assigned to a technician.",
  },
  {
    key: "bench_testing",
    label: "In Bench-Test",
    shortLabel: "In Bench-Test",
    icon: "science",
    desc: "Running FurMark, thermal, voltage & stability diagnostics in the lab.",
  },
  {
    key: "packed",
    label: "Packed",
    shortLabel: "Packed",
    icon: "inventory_2",
    desc: "Lab verified and sealed in anti-static ESD packaging with warranty slip.",
  },
  {
    key: "dispatched",
    label: "With Courier",
    shortLabel: "With Courier",
    icon: "local_shipping",
    desc: "Handed over to insured island-wide courier (or staged for showroom pickup).",
  },
  {
    key: "delivered",
    label: "Delivered",
    shortLabel: "Delivered",
    icon: "verified",
    desc: "Handed over to customer. Official Aqua PC Parts testing warranty active.",
  },
];

const STATUS_LABELS = {
  received: "Order Received",
  bench_testing: "In Bench-Test",
  packed: "Packed",
  dispatched: "With Courier",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const FULFILL_LABELS = {
  pickup: "Embilipitiya Showroom Pickup",
  courier: "Island-Wide ESD-Safe Courier",
  install: "Workshop Fitting & 24h Stress Test",
};

const WHATSAPP_PHONE = "94788194535";
const MAIN_SITE_ACCOUNT_URL = "https://aquapcsolutions.yyth.workers.dev/account";

const state = {
  ready: false,
  user: null,
  profile: null,
  quotes: [],
  orders: [],
  adminOrders: [],
  bankDetails: null,
  bankDetailsLoaded: false,
  payments: [],
  adminPayments: [],
  inventoryOverrides: new Map(),
  quotesUnsub: null,
  ordersUnsub: null,
  adminOrdersUnsub: null,
  bankDetailsUnsub: null,
  paymentsUnsub: null,
  adminPaymentsUnsub: null,
  inventoryUnsub: null,
  modalOpen: false,
  menuOpen: false,
  authMode: "signin", // "signin" | "register" | "reset"
  portalTab: "orders", // "orders" | "payments" | "quotes" | "profile" | "admin"
  orderFulfillment: "pickup",
  pendingPaymentOrder: "",
  pendingPaymentAmount: "",
  pendingPaymentRedirect: false,
  paymentGateNotice: false,
  draftName: "",
  draftEmail: "",
  busy: false,
  errorMsg: "",
  successMsg: "",
  invoiceOrder: null,
  trackOpen: false,
  trackQuery: "",
  trackLoading: false,
  trackError: "",
  trackResult: null,
  trackNotFound: false,
  trackUnsub: null,
  recaptchaActive: false,
};

initRecaptchaEnterprise();

function isAdminUser() {
  return Boolean(
    state.user &&
      state.user.emailVerified &&
      String(state.user.email || "").toLowerCase() === ADMIN_EMAIL
  );
}

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtLKR(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "Call for Price";
  return "Rs. " + Math.round(n).toLocaleString("en-LK");
}

function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtDate(ts) {
  const ms = tsMillis(ts);
  const d = ms ? new Date(ms) : new Date();
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFirstName(user, profile) {
  const full =
    (profile && profile.displayName) ||
    (user && user.displayName) ||
    (user && user.email ? user.email.split("@")[0] : "") ||
    "Member";
  return String(full).trim().split(/\s+/)[0].slice(0, 18);
}

function getInitials(user, profile) {
  const full =
    (profile && profile.displayName) ||
    (user && user.displayName) ||
    (user && user.email) ||
    "A";
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return String(full).slice(0, 2).toUpperCase();
}

function showPageToast(msg) {
  const toastEl = document.getElementById("toast");
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showPageToast._t);
    showPageToast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
}

// ───────── Live Firestore Inventory Overrides Sync ─────────
function applyInventoryOverridesToCatalog() {
  const cat = window.AQUA_PARTS_CATALOG;
  if (!cat || state.inventoryOverrides.size === 0) return;

  const collections = [
    ...(Array.isArray(cat.sections) ? cat.sections : []),
    ...(Array.isArray(cat.usedSections) ? cat.usedSections : []),
    ...(Array.isArray(cat.brandNewSections) ? cat.brandNewSections : []),
  ];

  let patched = 0;
  collections.forEach((sec) => {
    (sec.categories || []).forEach((sub) => {
      (sub.items || []).forEach((it) => {
        if (!it || !it.sku) return;
        const ov = state.inventoryOverrides.get(String(it.sku).toUpperCase());
        if (!ov) return;
        if (typeof ov.price === "number" && Number.isFinite(ov.price)) {
          it.price = ov.price;
        }
        it.stockQty = typeof ov.stockQty === "number" ? ov.stockQty : null;
        it.lowStockThreshold = typeof ov.lowStockThreshold === "number" ? ov.lowStockThreshold : 3;
        it.stockNote = ov.note || "";
        it.inStock = Boolean(ov.inStock) && (typeof ov.stockQty !== "number" || ov.stockQty > 0);
        patched += 1;
      });
    });
  });

  if (patched > 0) {
    window.dispatchEvent(new CustomEvent("aqua:catalog-updated"));
  }
}

function attachInventoryListener() {
  if (state.inventoryUnsub) return;
  const path = "inventoryOverrides";
  state.inventoryUnsub = onSnapshot(
    collection(db, "inventoryOverrides"),
    (snapshot) => {
      const nextMap = new Map();
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data && data.sku) {
          nextMap.set(String(data.sku).toUpperCase(), data);
        }
      });
      state.inventoryOverrides = nextMap;
      applyInventoryOverridesToCatalog();
      if (state.modalOpen && state.portalTab === "admin") {
        renderModalContent();
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (_) {}
    }
  );
}

async function saveInventoryOverride(skuRaw, opts) {
  if (!isAdminUser()) {
    throw new Error("Admin Google sign-in is required to update live Firestore stock.");
  }
  const sku = String(skuRaw || "").trim().toUpperCase();
  if (!sku || sku.length < 3 || sku.length > 64 || !LIMITS.skuPattern.test(sku)) {
    throw new Error("Invalid SKU format (e.g. AQ-VGA-0001).");
  }
  const stockQty = Math.max(0, Math.min(9999, Math.round(Number(opts.stockQty ?? 0))));
  const lowStockThreshold = Math.max(1, Math.min(50, Math.round(Number(opts.lowStockThreshold ?? 3))));
  const inStock = Boolean(opts.inStock) && stockQty > 0;
  const note = String(opts.note || "").trim().slice(0, LIMITS.stockNoteMax);

  const payload = {
    sku,
    stockQty,
    inStock,
    lowStockThreshold,
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid,
  };
  if (opts.price !== "" && opts.price != null && Number.isFinite(Number(opts.price))) {
    payload.price = Math.max(0, Math.min(100000000, Math.round(Number(opts.price))));
  }
  if (note) {
    payload.note = note;
  }

  const path = "inventoryOverrides/" + sku;
  try {
    await setDoc(doc(db, "inventoryOverrides", sku), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function deleteInventoryOverride(skuRaw) {
  if (!isAdminUser()) return;
  const sku = String(skuRaw || "").trim().toUpperCase();
  if (!sku) return;
  const path = "inventoryOverrides/" + sku;
  try {
    await deleteDoc(doc(db, "inventoryOverrides", sku));
    showPageToast("Stock override cleared for " + sku);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (_) {
      state.errorMsg = "Could not delete inventory override.";
      renderModalContent();
    }
  }
}

function getAllCatalogItemsFlat() {
  const cat = window.AQUA_PARTS_CATALOG;
  const seen = new Set();
  const list = [];
  if (!cat) return list;
  [
    ...(Array.isArray(cat.usedSections) ? cat.usedSections : cat.sections || []),
    ...(Array.isArray(cat.brandNewSections) ? cat.brandNewSections : []),
  ].forEach((s) => {
    (s.categories || []).forEach((c) => {
      (c.items || []).forEach((it) => {
        if (!it || !it.id || seen.has(it.id)) return;
        seen.add(it.id);
        list.push(it);
      });
    });
  });
  return list;
}

function readLocalCartSnapshot() {
  const items = [];
  let totalLkr = 0;
  let fulfillment = "pickup";

  const byId = new Map();
  getAllCatalogItemsFlat().forEach((it) => byId.set(it.id, it));

  // 1. Check main storefront cart keys (aqua-shop-cart-v1 and legacy aqua-ne-cart-v3)
  const cartKeys = ["aqua-shop-cart-v1", "aqua-ne-cart-v3"];
  for (const key of cartKeys) {
    if (items.length > 0) break;
    try {
      const rawCart = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(rawCart) && rawCart.length > 0) {
        rawCart.forEach((entry) => {
          if (!entry || !entry.id) return;
          const qty = Math.max(1, Math.min(20, Number(entry.qty) || 1));
          const prod = byId.get(entry.id);
          const name = (prod && prod.name) || entry.name || entry.id;
          const sku = (prod && prod.sku) || entry.sku || "";
          const price = prod && typeof prod.price === "number" ? prod.price : null;
          if (price != null) totalLkr += price * qty;
          items.push({ name, sku, qty, price });
        });
      }
    } catch (_) {}
  }

  // 2. Fallback to Used/Brand New quote list
  const quoteKeys = ["aqua-parts-quote-v2", "aqua-parts-quote-v1"];
  for (const key of quoteKeys) {
    if (items.length > 0) break;
    try {
      const qSaved = JSON.parse(localStorage.getItem(key) || "null");
      if (qSaved && qSaved.quoteList && typeof qSaved.quoteList === "object") {
        if (qSaved.quoteFulfillment && LIMITS.validFulfillments.has(qSaved.quoteFulfillment)) {
          fulfillment = qSaved.quoteFulfillment;
        }
        Object.values(qSaved.quoteList).forEach((entry) => {
          if (!entry || !entry.item) return;
          const qty = Math.max(1, Math.min(20, Number(entry.quantity) || 1));
          const price = typeof entry.item.price === "number" ? entry.item.price : null;
          if (price != null) totalLkr += price * qty;
          items.push({
            name: entry.item.name || entry.item.id || "PC Part",
            sku: entry.item.sku || "",
            qty,
            price,
          });
        });
      }
    } catch (_) {}
  }

  return { items, totalLkr, fulfillment };
}

function detectUserProvider(user) {
  if (user && Array.isArray(user.providerData)) {
    if (user.providerData.some((p) => p && p.providerId === "facebook.com")) {
      return "facebook";
    }
    if (user.providerData.some((p) => p && p.providerId === "google.com")) {
      return "google";
    }
  }
  return "password";
}

function getProviderBadgeLabel(user, isPortal) {
  if (isAdminUser()) {
    return isPortal ? "VERIFIED STORE ADMIN · AQUA LAB" : "VERIFIED STORE ADMIN";
  }
  const prov = detectUserProvider(user);
  if (prov === "facebook") {
    return isPortal ? "FACEBOOK VERIFIED · AQUA MEMBER" : "FACEBOOK VERIFIED";
  }
  if (prov === "google") {
    return isPortal ? "GOOGLE VERIFIED · AQUA MEMBER" : "GOOGLE VERIFIED";
  }
  if (user && user.emailVerified) {
    return isPortal ? "EMAIL VERIFIED · AQUA MEMBER" : "EMAIL VERIFIED";
  }
  return isPortal ? "AQUA PC PARTS MEMBER" : "AQUA MEMBER";
}

// ───────── Profile, Quotes & Tracked Orders Firestore Actions ─────────
const profileSyncInFlight = new Map();

async function syncUserProfile(user, preferredDisplayName) {
  if (!user || !user.uid) return null;
  const uid = user.uid;
  const cleanPreferred = String(preferredDisplayName || "").trim().slice(0, LIMITS.displayNameMax);

  if (profileSyncInFlight.has(uid)) {
    const existingProfile = await profileSyncInFlight.get(uid);
    if (cleanPreferred && existingProfile && existingProfile.displayName !== cleanPreferred) {
      try {
        await updateDoc(doc(db, "users", uid), {
          displayName: cleanPreferred,
          updatedAt: serverTimestamp(),
        });
        state.profile = { ...existingProfile, displayName: cleanPreferred };
      } catch (_) {}
    }
    return state.profile;
  }

  const run = (async () => {
    const path = "users/" + uid;
    const ref = doc(db, "users", uid);
    const displayName =
      cleanPreferred ||
      String(user.displayName || (user.email ? user.email.split("@")[0] : "Aqua Member"))
        .trim()
        .slice(0, LIMITS.displayNameMax) ||
      "Aqua Member";
    const email = String(user.email || "member@aquapcparts.lk").trim().slice(0, LIMITS.emailMax);
    const photoURL = user.photoURL ? String(user.photoURL).slice(0, LIMITS.photoURLMax) : "";
    const provider = detectUserProvider(user);

    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const payload = {
          uid,
          displayName,
          email,
          provider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (photoURL) payload.photoURL = photoURL;
        try {
          await setDoc(ref, payload);
          state.profile = {
            uid,
            displayName,
            email,
            photoURL,
            phone: "",
            city: "",
            provider,
          };
        } catch (writeErr) {
          // If another tab/listener created the doc concurrently, recover by reading it
          const retrySnap = await getDoc(ref).catch(() => null);
          if (retrySnap && retrySnap.exists()) {
            const data = retrySnap.data();
            state.profile = {
              uid: data.uid || uid,
              displayName: data.displayName || displayName,
              email: data.email || email,
              photoURL: data.photoURL || photoURL,
              phone: data.phone || "",
              city: data.city || "",
              provider: data.provider || provider,
            };
          } else {
            throw writeErr;
          }
        }
      } else {
        const data = snap.data();
        let resolvedName = data.displayName || displayName;
        if (cleanPreferred && resolvedName !== cleanPreferred) {
          try {
            await updateDoc(ref, {
              displayName: cleanPreferred,
              updatedAt: serverTimestamp(),
            });
            resolvedName = cleanPreferred;
          } catch (_) {}
        }
        state.profile = {
          uid: data.uid || uid,
          displayName: resolvedName,
          email: data.email || email,
          photoURL: data.photoURL || photoURL,
          phone: data.phone || "",
          city: data.city || "",
          provider: data.provider || provider,
        };
      }
      return state.profile;
    } catch (error) {
      // Fallback in-memory profile so authenticated user is never locked out of the portal
      state.profile = state.profile || {
        uid,
        displayName,
        email,
        photoURL,
        phone: "",
        city: "",
        provider,
      };
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (_) {}
      return state.profile;
    } finally {
      profileSyncInFlight.delete(uid);
    }
  })();

  profileSyncInFlight.set(uid, run);
  return run;
}

function attachQuotesListener(user) {
  detachQuotesListener();
  if (!user) return;
  const path = "users/" + user.uid + "/savedQuotes";
  const q = query(
    collection(db, "users", user.uid, "savedQuotes"),
    where("ownerId", "==", user.uid)
  );
  state.quotesUnsub = onSnapshot(
    q,
    (snapshot) => {
      state.quotes = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
      if (state.modalOpen && state.portalTab === "quotes") {
        renderModalContent();
      }
      renderHeaderSlot();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (_) {
        state.errorMsg = "Could not sync saved quotes right now.";
        renderModalContent();
      }
    }
  );
}

function detachQuotesListener() {
  if (typeof state.quotesUnsub === "function") {
    state.quotesUnsub();
    state.quotesUnsub = null;
  }
  state.quotes = [];
}

function attachOrdersListener(user) {
  detachOrdersListener();
  if (!user) return;
  const path = "orders";
  const q = query(collection(db, "orders"), where("ownerId", "==", user.uid));
  state.ordersUnsub = onSnapshot(
    q,
    (snapshot) => {
      state.orders = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
      if (state.modalOpen && state.portalTab === "orders") {
        renderModalContent();
      }
      renderHeaderSlot();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (_) {
        state.errorMsg = "Could not sync live orders right now.";
        renderModalContent();
      }
    }
  );

  // If Admin, also listen to all orders for live Workshop Desk management
  if (isAdminUser()) {
    state.adminOrdersUnsub = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        state.adminOrders = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
        if (state.modalOpen && state.portalTab === "admin") {
          renderModalContent();
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "orders");
        } catch (_) {}
      }
    );
  }
}

function detachOrdersListener() {
  if (typeof state.ordersUnsub === "function") {
    state.ordersUnsub();
    state.ordersUnsub = null;
  }
  if (typeof state.adminOrdersUnsub === "function") {
    state.adminOrdersUnsub();
    state.adminOrdersUnsub = null;
  }
  state.orders = [];
  state.adminOrders = [];
}

function attachBankDetailsListener(user) {
  detachBankDetailsListener();
  if (!user) return;
  const path = "storeSettings/bankTransfer";
  state.bankDetailsUnsub = onSnapshot(
    doc(db, "storeSettings", "bankTransfer"),
    (snap) => {
      state.bankDetailsLoaded = true;
      state.bankDetails = snap.exists() ? snap.data() : null;
      if (state.modalOpen && (state.portalTab === "payments" || state.portalTab === "admin")) {
        renderModalContent();
      }
    },
    (error) => {
      state.bankDetailsLoaded = true;
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (_) {}
    }
  );
}

function detachBankDetailsListener() {
  if (typeof state.bankDetailsUnsub === "function") {
    state.bankDetailsUnsub();
    state.bankDetailsUnsub = null;
  }
  state.bankDetails = null;
  state.bankDetailsLoaded = false;
}

function attachPaymentsListener(user) {
  detachPaymentsListener();
  if (!user) return;
  const path = "payments";
  const q = query(collection(db, "payments"), where("ownerId", "==", user.uid));
  state.paymentsUnsub = onSnapshot(
    q,
    (snapshot) => {
      state.payments = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
      if (state.modalOpen && state.portalTab === "payments") {
        renderModalContent();
      }
      renderHeaderSlot();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (_) {
        state.errorMsg = "Could not sync payment records right now.";
        renderModalContent();
      }
    }
  );

  if (isAdminUser()) {
    state.adminPaymentsUnsub = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        state.adminPayments = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
        if (state.modalOpen && state.portalTab === "admin") {
          renderModalContent();
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (_) {}
      }
    );
  }
}

function detachPaymentsListener() {
  if (typeof state.paymentsUnsub === "function") {
    state.paymentsUnsub();
    state.paymentsUnsub = null;
  }
  if (typeof state.adminPaymentsUnsub === "function") {
    state.adminPaymentsUnsub();
    state.adminPaymentsUnsub = null;
  }
  state.payments = [];
  state.adminPayments = [];
}

function consumePendingPaymentRedirect() {
  if (!state.pendingPaymentRedirect) return false;
  state.portalTab = "payments";
  state.pendingPaymentRedirect = false;
  state.paymentGateNotice = false;
  return true;
}

function isRecaptchaErrorCode(code) {
  return (
    code === "auth/captcha-check-failed" ||
    code === "auth/missing-recaptcha-token" ||
    code === "auth/invalid-recaptcha-token" ||
    code === "auth/app-check-token-is-invalid" ||
    code === "appCheck/recaptcha-error" ||
    code === "appCheck/fetch-status-error"
  );
}

const RECAPTCHA_ERROR_MESSAGE =
  "reCAPTCHA Enterprise verification failed. Please reload the page and try again (verify this domain is allowlisted for your reCAPTCHA key).";

function mapProviderAuthError(error, providerLabel) {
  const code = error && error.code ? String(error.code) : "";
  if (isRecaptchaErrorCode(code)) {
    return RECAPTCHA_ERROR_MESSAGE;
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return providerLabel + " sign-in popup was closed before completing. Click Continue with " + providerLabel + " to try again.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the " + providerLabel + " sign-in popup. Redirecting or allow popups for this site, or use Email & Password below.";
  }
  if (code === "auth/unauthorized-domain") {
    const host = window.location.hostname || window.location.origin;
    return "Domain '" + host + "' is not authorized in Firebase Console (Project " + firebaseConfig.projectId + " → Authentication → Settings → Authorized domains). Add '" + host + "' there, or sign in via Email & Password below.";
  }
  if (code === "auth/operation-not-allowed") {
    return providerLabel + " Login is not enabled in Firebase Console (Project " + firebaseConfig.projectId + " → Authentication → Sign-in method → " + providerLabel + "). Use Google or Email & Password below until enabled.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email address using another sign-in method. Please sign in with that method instead.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection interrupted during " + providerLabel + " sign-in. Please check your internet and try again.";
  }
  if (code === "auth/user-disabled") {
    return "This account has been disabled. Contact Aqua PC Parts support on WhatsApp for assistance.";
  }
  return "Unable to complete " + providerLabel + " sign-in" + (code ? " (" + code + ")" : "") + ". Please try again.";
}

function shouldFallbackToRedirect(error) {
  const code = error && error.code ? String(error.code) : "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/operation-not-supported-in-this-environment" ||
    code === "auth/cancelled-popup-request"
  );
}

async function startOAuthRedirect(providerKey, providerObj, wasPaymentGate) {
  try {
    sessionStorage.setItem(
      REDIRECT_STATE_KEY,
      JSON.stringify({
        provider: providerKey,
        paymentGate: Boolean(wasPaymentGate),
        authMode: state.authMode,
        ts: Date.now(),
      })
    );
  } catch (_) {}
  await signInWithRedirect(auth, providerObj);
}

async function signInWithGoogle() {
  if (state.busy) return;
  const wasPaymentGate = state.pendingPaymentRedirect || state.portalTab === "payments";
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await ensureFirebase();
    if (appCheckInstance) {
      getAppCheckToken(appCheckInstance, false).catch(() => {});
    }
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    state.user = user;
    await syncUserProfile(user);
    const unlockedPayment = consumePendingPaymentRedirect() || wasPaymentGate;
    if (unlockedPayment) state.portalTab = "payments";
    state.draftName = "";
    state.draftEmail = "";
    state.successMsg = unlockedPayment
      ? "Account verified! Official bank details and the Payment Portal are now unlocked."
      : state.authMode === "register"
        ? "Account verified! Your Aqua PC Parts profile & orders are synced."
        : "Welcome back! Your Aqua session is synced.";
    state.busy = false;
    renderHeaderSlot();
    renderModalContent();
    showPageToast("Signed in as " + getFirstName(user, state.profile));
  } catch (error) {
    if (shouldFallbackToRedirect(error) && auth && googleProvider) {
      try {
        await startOAuthRedirect("google", googleProvider, wasPaymentGate);
        return;
      } catch (redirErr) {
        error = redirErr;
      }
    }
    state.busy = false;
    state.errorMsg = mapProviderAuthError(error, "Google");
    renderModalContent();
  }
}

async function signInWithFacebook() {
  if (state.busy) return;
  const wasPaymentGate = state.pendingPaymentRedirect || state.portalTab === "payments";
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await ensureFirebase();
    if (appCheckInstance) {
      getAppCheckToken(appCheckInstance, false).catch(() => {});
    }
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;
    state.user = user;
    await syncUserProfile(user);
    const unlockedPayment = consumePendingPaymentRedirect() || wasPaymentGate;
    if (unlockedPayment) state.portalTab = "payments";
    state.draftName = "";
    state.draftEmail = "";
    state.successMsg = unlockedPayment
      ? "Facebook account connected! Official bank details and the Payment Portal are now unlocked."
      : state.authMode === "register"
        ? "Facebook account connected! Your Aqua PC Parts profile & orders are synced."
        : "Welcome back! Signed in with Facebook.";
    state.busy = false;
    renderHeaderSlot();
    renderModalContent();
    showPageToast("Signed in as " + getFirstName(user, state.profile));
  } catch (error) {
    if (shouldFallbackToRedirect(error) && auth && facebookProvider) {
      try {
        await startOAuthRedirect("facebook", facebookProvider, wasPaymentGate);
        return;
      } catch (redirErr) {
        error = redirErr;
      }
    }
    state.busy = false;
    state.errorMsg = mapProviderAuthError(error, "Facebook");
    renderModalContent();
  }
}

function mapEmailAuthError(error) {
  const code = error && error.code ? String(error.code) : "";
  if (isRecaptchaErrorCode(code)) {
    return RECAPTCHA_ERROR_MESSAGE;
  }
  if (code === "auth/operation-not-allowed") {
    return "Email & Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password).";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password. Please check your credentials or click Forgot password.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account with this email already exists. Switch to Sign In or use Continue with Google.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters long.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection error. Please check your internet connection and try again.";
  }
  if (code === "auth/user-disabled") {
    return "This account has been disabled. Contact Aqua PC Parts support on WhatsApp.";
  }
  return "Authentication failed" + (code ? " (" + code + ")" : "") + ". Please try again.";
}

async function signInWithEmail(emailRaw, passwordRaw) {
  if (state.busy) return;
  const email = String(emailRaw || "").trim();
  const password = String(passwordRaw || "");
  state.draftEmail = email;
  if (!email || !email.includes("@")) {
    state.errorMsg = "Please enter a valid email address.";
    renderModalContent();
    return;
  }
  if (!password) {
    state.errorMsg = "Please enter your password.";
    renderModalContent();
    return;
  }

  const wasPaymentGate = state.pendingPaymentRedirect || state.portalTab === "payments";
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await ensureFirebase();
    await ensureRecaptchaVerification();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    state.user = cred.user;
    await syncUserProfile(cred.user);
    const unlockedPayment = consumePendingPaymentRedirect() || wasPaymentGate;
    if (unlockedPayment) state.portalTab = "payments";
    state.draftName = "";
    state.draftEmail = "";
    state.busy = false;
    state.successMsg = unlockedPayment
      ? "Welcome back! Official bank details and the Payment Portal are now unlocked."
      : "Welcome back! Your Aqua session is synced.";
    renderHeaderSlot();
    renderModalContent();
    showPageToast("Signed in as " + getFirstName(cred.user, state.profile));
  } catch (error) {
    state.busy = false;
    state.errorMsg = mapEmailAuthError(error);
    renderModalContent();
  }
}

async function registerWithEmail(nameRaw, emailRaw, passwordRaw) {
  if (state.busy) return;
  const displayName = String(nameRaw || "").trim().slice(0, LIMITS.displayNameMax);
  const email = String(emailRaw || "").trim();
  const password = String(passwordRaw || "");
  state.draftName = displayName;
  state.draftEmail = email;

  if (!displayName) {
    state.errorMsg = "Please enter your full name to create an account.";
    renderModalContent();
    return;
  }
  if (!email || !email.includes("@")) {
    state.errorMsg = "Please enter a valid email address.";
    renderModalContent();
    return;
  }
  if (password.length < 6) {
    state.errorMsg = "Please choose a password with at least 6 characters.";
    renderModalContent();
    return;
  }

  const wasPaymentGate = state.pendingPaymentRedirect || state.portalTab === "payments";
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await ensureFirebase();
    await ensureRecaptchaVerification();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    state.user = cred.user;
    try {
      await updateProfile(cred.user, { displayName });
    } catch (_) {}
    try {
      await sendEmailVerification(cred.user);
    } catch (_) {}
    await syncUserProfile(cred.user, displayName);
    const unlockedPayment = consumePendingPaymentRedirect() || wasPaymentGate;
    if (unlockedPayment) state.portalTab = "payments";
    state.draftName = "";
    state.draftEmail = "";
    state.busy = false;
    state.successMsg = unlockedPayment
      ? "Account created! Official bank details and the Payment Portal are now unlocked."
      : "Account created! A verification email has been sent to " + email + ".";
    renderHeaderSlot();
    renderModalContent();
    showPageToast("Welcome to Aqua PC Parts, " + getFirstName(cred.user, state.profile) + "!");
  } catch (error) {
    state.busy = false;
    state.errorMsg = mapEmailAuthError(error);
    renderModalContent();
  }
}

async function resetPasswordWithEmail(emailRaw) {
  if (state.busy) return;
  const email = String(emailRaw || "").trim();
  state.draftEmail = email;
  if (!email || !email.includes("@")) {
    state.errorMsg = "Enter your account email address to receive a password reset link.";
    renderModalContent();
    return;
  }

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await ensureFirebase();
    await ensureRecaptchaVerification();
    await sendPasswordResetEmail(auth, email);
    state.busy = false;
    state.successMsg = "Password reset link sent to " + email + ". Check your inbox or spam folder.";
    renderModalContent();
  } catch (error) {
    state.busy = false;
    state.errorMsg = mapEmailAuthError(error);
    renderModalContent();
  }
}

async function resendVerificationEmail() {
  if (!state.user || state.busy) return;
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();
  try {
    await sendEmailVerification(state.user);
    state.busy = false;
    state.successMsg = "Verification link sent to " + (state.user.email || "your email") + ". Check your inbox or spam folder.";
    renderModalContent();
    showPageToast("Verification email sent");
  } catch (error) {
    state.busy = false;
    state.errorMsg = mapEmailAuthError(error);
    renderModalContent();
  }
}

async function refreshEmailVerificationStatus() {
  if (!state.user || state.busy) return;
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();
  try {
    await state.user.reload();
    state.user = auth.currentUser;
    state.busy = false;
    if (state.user && state.user.emailVerified) {
      state.successMsg = "Your email is verified!";
      attachOrdersListener(state.user);
      attachPaymentsListener(state.user);
    } else {
      state.errorMsg = "Email is not verified yet. Open the verification link in your inbox, then click Refresh again.";
    }
    renderHeaderSlot();
    renderModalContent();
  } catch (_) {
    state.busy = false;
    state.errorMsg = "Could not refresh verification status right now. Please try again.";
    renderModalContent();
  }
}

async function handleSignOut() {
  try {
    detachQuotesListener();
    detachOrdersListener();
    detachBankDetailsListener();
    detachPaymentsListener();
    await firebaseSignOut(auth);
    state.user = null;
    state.profile = null;
    state.menuOpen = false;
    state.modalOpen = false;
    state.paymentGateNotice = false;
    state.pendingPaymentRedirect = false;
    state.pendingPaymentOrder = "";
    state.pendingPaymentAmount = "";
    state.draftName = "";
    state.draftEmail = "";
    state.errorMsg = "";
    state.successMsg = "";
    renderHeaderSlot();
    syncModalVisibility();
    showPageToast("Signed out of Aqua PC Parts");
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
}

async function saveProfileChanges(displayNameRaw, phoneRaw, cityRaw) {
  if (!state.user || state.busy) return;
  const displayName = String(displayNameRaw || "").trim().slice(0, LIMITS.displayNameMax);
  const phone = String(phoneRaw || "").trim().slice(0, LIMITS.phoneMax);
  const city = String(cityRaw || "").trim().slice(0, LIMITS.cityMax);

  if (!displayName) {
    state.errorMsg = "Display name is required.";
    renderModalContent();
    return;
  }
  if (phone && !LIMITS.phonePattern.test(phone)) {
    state.errorMsg = "Phone number may only include digits, +, -, spaces, and parentheses.";
    renderModalContent();
    return;
  }

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  const path = "users/" + state.user.uid;
  try {
    const ref = doc(db, "users", state.user.uid);
    await updateDoc(ref, {
      displayName,
      phone,
      city,
      updatedAt: serverTimestamp(),
    });
    state.profile = { ...(state.profile || {}), displayName, phone, city };
    state.busy = false;
    state.successMsg = "Profile saved to your Aqua account.";
    renderHeaderSlot();
    renderModalContent();
    showPageToast("Profile updated");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (_) {
      state.errorMsg = "Could not save profile changes. Please try again.";
      renderModalContent();
    }
  }
}

async function saveCurrentCartToCloud(customTitleRaw) {
  if (!state.user || state.busy) return;
  const snap = readLocalCartSnapshot();
  if (snap.items.length === 0) {
    state.errorMsg = "Your Cart / Quote list is currently empty. Add at least one PC part first.";
    renderModalContent();
    return;
  }

  const itemCount = Math.min(
    LIMITS.quoteItemMax,
    Math.max(1, snap.items.reduce((sum, it) => sum + it.qty, 0))
  );
  const totalLkr = Math.min(LIMITS.quoteTotalMax, Math.max(0, Math.round(snap.totalLkr)));
  const defaultTitle =
    snap.items.length === 1
      ? snap.items[0].name
      : snap.items[0].name + " + " + (snap.items.length - 1) + " more";
  const title =
    String(customTitleRaw || defaultTitle).trim().slice(0, LIMITS.quoteTitleMax) ||
    "PC Hardware Quote";

  const summary = snap.items
    .map(
      (it, idx) =>
        idx +
        1 +
        ". " +
        it.name +
        (it.sku ? " [" + it.sku + "]" : "") +
        " x" +
        it.qty +
        (it.price != null ? " — " + fmtLKR(it.price * it.qty) : " — Live Quote")
    )
    .join("\n")
    .slice(0, LIMITS.quoteSummaryMax);

  const quoteId = "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const path = "users/" + state.user.uid + "/savedQuotes/" + quoteId;

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    if (!state.profile) await syncUserProfile(state.user);
    await setDoc(doc(db, "users", state.user.uid, "savedQuotes", quoteId), {
      ownerId: state.user.uid,
      title,
      itemCount,
      totalLkr,
      summary,
      fulfillment: LIMITS.validFulfillments.has(snap.fulfillment) ? snap.fulfillment : "pickup",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    state.busy = false;
    state.successMsg = "Quote saved to your Aqua account!";
    renderModalContent();
    showPageToast("Quote saved to cloud");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (_) {
      state.errorMsg = "Could not save quote to cloud. Please try again.";
      renderModalContent();
    }
  }
}

async function saveCustomQuote(opts) {
  if (!state.user) {
    openModal("signin");
    return false;
  }
  const title =
    String((opts && opts.title) || "Custom PC Hardware Quote")
      .trim()
      .slice(0, LIMITS.quoteTitleMax) || "Custom PC Hardware Quote";
  const itemCount = Math.min(
    LIMITS.quoteItemMax,
    Math.max(1, Math.round(Number(opts && opts.itemCount) || 1))
  );
  const totalLkr = Math.min(
    LIMITS.quoteTotalMax,
    Math.max(0, Math.round(Number(opts && opts.totalLkr) || 0))
  );
  const summary =
    String((opts && opts.summary) || title)
      .trim()
      .slice(0, LIMITS.quoteSummaryMax) || title;
  const rawFulfill = String((opts && opts.fulfillment) || "pickup");
  const fulfillment = LIMITS.validFulfillments.has(rawFulfill) ? rawFulfill : "pickup";

  const quoteId = "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const path = "users/" + state.user.uid + "/savedQuotes/" + quoteId;

  try {
    if (!state.profile) await syncUserProfile(state.user);
    await setDoc(doc(db, "users", state.user.uid, "savedQuotes", quoteId), {
      ownerId: state.user.uid,
      title,
      itemCount,
      totalLkr,
      summary,
      fulfillment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showPageToast("Quote saved to your Aqua account");
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return false;
  }
}

async function deleteSavedQuote(quoteId) {
  if (!state.user || !quoteId || state.busy) return;
  const path = "users/" + state.user.uid + "/savedQuotes/" + quoteId;
  try {
    await deleteDoc(doc(db, "users", state.user.uid, "savedQuotes", quoteId));
    showPageToast("Saved quote removed");
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (_) {
      state.errorMsg = "Failed to delete quote.";
      renderModalContent();
    }
  }
}

function generateOrderNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4).padEnd(4, "A");
  return "AQ-" + yy + mm + dd + "-" + rand;
}

async function createTrackedOrder(sourceQuote) {
  if (!state.user || state.busy) return;

  let itemsSummary = "";
  let itemCount = 0;
  let totalLkr = 0;
  let fulfillment = state.orderFulfillment || "pickup";

  if (sourceQuote) {
    itemsSummary = String(sourceQuote.summary || "").slice(0, LIMITS.orderSummaryMax);
    itemCount = Math.min(LIMITS.quoteItemMax, Math.max(1, Math.round(Number(sourceQuote.itemCount) || 1)));
    totalLkr = Math.min(LIMITS.quoteTotalMax, Math.max(0, Math.round(Number(sourceQuote.totalLkr) || 0)));
    if (LIMITS.validFulfillments.has(sourceQuote.fulfillment)) {
      fulfillment = sourceQuote.fulfillment;
    }
  } else {
    const snap = readLocalCartSnapshot();
    if (snap.items.length === 0) {
      state.errorMsg = "Your Cart is empty. Add hardware parts to your Cart first to place a tracked order.";
      renderModalContent();
      return;
    }
    itemCount = Math.min(
      LIMITS.quoteItemMax,
      Math.max(1, snap.items.reduce((s, it) => s + it.qty, 0))
    );
    totalLkr = Math.min(LIMITS.quoteTotalMax, Math.max(0, Math.round(snap.totalLkr)));
    itemsSummary = snap.items
      .map(
        (it, idx) =>
          idx +
          1 +
          ". " +
          it.name +
          (it.sku ? " [" + it.sku + "]" : "") +
          " x" +
          it.qty +
          (it.price != null ? " — " + fmtLKR(it.price * it.qty) : " — Live Quote")
      )
      .join("\n")
      .slice(0, LIMITS.orderSummaryMax);
  }

  if (!itemsSummary) {
    state.errorMsg = "Cannot create an empty order.";
    renderModalContent();
    return;
  }

  const orderId = "ord_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const orderNumber = generateOrderNumber();
  const profile = state.profile || {};
  const customerName =
    String(profile.displayName || state.user.displayName || "Aqua Customer")
      .trim()
      .slice(0, LIMITS.displayNameMax) || "Aqua Customer";
  const customerEmail = String(profile.email || state.user.email || "member@aquapcparts.lk")
    .trim()
    .slice(0, LIMITS.emailMax);
  const customerPhone = String(profile.phone || "").trim().slice(0, LIMITS.phoneMax);
  const deliveryCity = String(profile.city || "").trim().slice(0, LIMITS.cityMax);

  const payload = {
    orderId,
    orderNumber,
    ownerId: state.user.uid,
    customerName,
    customerEmail,
    fulfillment: LIMITS.validFulfillments.has(fulfillment) ? fulfillment : "pickup",
    itemsSummary,
    itemCount,
    totalLkr,
    status: "received",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (customerPhone && LIMITS.phonePattern.test(customerPhone)) {
    payload.customerPhone = customerPhone;
  }
  if (deliveryCity) {
    payload.deliveryCity = deliveryCity;
  }

  const trackingPayload = {
    orderNumber,
    orderId,
    ownerId: state.user.uid,
    fulfillment: payload.fulfillment,
    itemCount,
    status: "received",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (deliveryCity) {
    trackingPayload.deliveryRegion = deliveryCity;
  }

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  const path = "orders/" + orderId;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "orders", orderId), payload);
    batch.set(doc(db, "orderTracking", orderNumber), trackingPayload);
    await batch.commit();
    state.busy = false;
    state.portalTab = "orders";
    state.successMsg = "Order " + orderNumber + " submitted! Share or enter this order number in Track Order anytime.";
    renderModalContent();
    showPageToast("Tracked order " + orderNumber + " placed!");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (_) {
      state.errorMsg = "Could not place tracked order. Please verify your account and try again.";
      renderModalContent();
    }
  }
}

async function cancelMyOrder(orderId) {
  if (!state.user || !orderId || state.busy) return;
  const path = "orders/" + orderId;
  state.busy = true;
  state.errorMsg = "";
  renderModalContent();
  try {
    const localOrder = state.orders.find((o) => o.id === orderId || o.orderId === orderId);
    const orderNumber = localOrder && localOrder.orderNumber ? String(localOrder.orderNumber).toUpperCase() : "";
    let hasTrackingDoc = false;
    if (orderNumber && LIMITS.orderNumberPattern.test(orderNumber)) {
      try {
        const trackSnap = await getDoc(doc(db, "orderTracking", orderNumber));
        hasTrackingDoc = trackSnap.exists();
      } catch (_) {}
    }

    const batch = writeBatch(db);
    batch.update(doc(db, "orders", orderId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });
    if (hasTrackingDoc) {
      batch.update(doc(db, "orderTracking", orderNumber), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    state.busy = false;
    state.successMsg = "Order cancelled.";
    renderModalContent();
    showPageToast("Order cancelled");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (_) {
      state.errorMsg = "Only newly received orders can be cancelled online. Message us on WhatsApp for help.";
      renderModalContent();
    }
  }
}

async function adminUpdateOrderStatus(orderId, nextStatus, statusNoteRaw) {
  if (!isAdminUser() || !orderId || state.busy) return;
  if (!LIMITS.validStatuses.includes(nextStatus)) return;
  const statusNote = String(statusNoteRaw || "").trim().slice(0, LIMITS.orderNoteMax);
  const path = "orders/" + orderId;
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();
  try {
    const orderDoc =
      state.adminOrders.find((o) => o.id === orderId || o.orderId === orderId) ||
      state.orders.find((o) => o.id === orderId || o.orderId === orderId);
    const orderNumber = orderDoc && orderDoc.orderNumber ? String(orderDoc.orderNumber).toUpperCase() : "";
    const batch = writeBatch(db);
    batch.update(doc(db, "orders", orderId), {
      status: nextStatus,
      statusNote,
      updatedAt: serverTimestamp(),
    });

    if (orderNumber && LIMITS.orderNumberPattern.test(orderNumber)) {
      const trackRef = doc(db, "orderTracking", orderNumber);
      let trackExists = false;
      try {
        const snap = await getDoc(trackRef);
        trackExists = snap.exists();
      } catch (_) {}

      if (trackExists) {
        batch.update(trackRef, {
          status: nextStatus,
          statusNote,
          updatedAt: serverTimestamp(),
        });
      } else if (orderDoc && orderDoc.ownerId) {
        const backfill = {
          orderNumber,
          orderId,
          ownerId: orderDoc.ownerId,
          fulfillment: LIMITS.validFulfillments.has(orderDoc.fulfillment) ? orderDoc.fulfillment : "pickup",
          itemCount: Math.min(LIMITS.quoteItemMax, Math.max(1, Math.round(Number(orderDoc.itemCount) || 1))),
          status: nextStatus,
          statusNote,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (orderDoc.deliveryCity) {
          backfill.deliveryRegion = String(orderDoc.deliveryCity).trim().slice(0, LIMITS.cityMax);
        }
        batch.set(trackRef, backfill);
      }
    }

    await batch.commit();
    state.busy = false;
    state.successMsg = "Order status updated to " + (STATUS_LABELS[nextStatus] || nextStatus) + ".";
    renderModalContent();
    showPageToast("Order updated live");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (_) {
      state.errorMsg = "Could not update order status.";
      renderModalContent();
    }
  }
}

function generatePaymentRef() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4).padEnd(4, "P");
  return "PAY-" + yy + mm + dd + "-" + rand;
}

function getTodayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function copyTextWithToast(text, label) {
  const val = String(text || "").trim();
  if (!val) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(val).then(
      () => showPageToast("Copied " + (label || val)),
      () => showPageToast((label ? label + ": " : "") + val)
    );
  } else {
    showPageToast((label ? label + ": " : "") + val);
  }
}

function buildPaymentWhatsAppHref(p) {
  const lines = [
    "Hello Aqua PC Parts Billing Desk!",
    "I have submitted a payment confirmation via the website Payment Portal:",
    "Payment Ref: " + (p.paymentRef || p.paymentId),
    p.orderNumber ? "Order #: " + p.orderNumber : "",
    "Amount: " + fmtLKR(Number(p.amountLkr) || 0),
    "Method: " + (PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod),
    "Bank Ref / Slip #: " + (p.bankReference || ""),
    "Depositor: " + (p.depositorName || ""),
    "Transfer Date: " + (p.transferDate || ""),
  ].filter(Boolean);
  return "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(lines.join("\n"));
}

async function submitBuyerPayment(raw) {
  if (!state.user || state.busy) return;

  const amountNum = Number(raw.amountLkr);
  const paymentMethod = String(raw.paymentMethod || "bank_transfer");
  const bankReference = String(raw.bankReference || "").trim().slice(0, LIMITS.bankRefMax);
  const depositorName = String(raw.depositorName || "").trim().slice(0, LIMITS.depositorNameMax);
  const transferDate = String(raw.transferDate || "").trim().slice(0, LIMITS.transferDateMax);
  const note = String(raw.note || "").trim().slice(0, LIMITS.paymentNoteMax);
  const orderNumber = String(raw.orderNumber || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!Number.isFinite(amountNum) || amountNum < 1 || amountNum > LIMITS.quoteTotalMax) {
    state.errorMsg = "Enter a valid payment amount in LKR (at least Rs. 1).";
    renderModalContent();
    return;
  }
  if (!LIMITS.validPaymentMethods.has(paymentMethod)) {
    state.errorMsg = "Please select a valid payment method.";
    renderModalContent();
    return;
  }
  if (bankReference.length < 2) {
    state.errorMsg = "Enter your bank transfer reference, CEFT receipt number, or deposit slip number.";
    renderModalContent();
    return;
  }
  if (depositorName.length < 1) {
    state.errorMsg = "Enter the depositor or account holder name used for the transfer.";
    renderModalContent();
    return;
  }
  if (transferDate.length < 4) {
    state.errorMsg = "Select the date you completed the bank transfer.";
    renderModalContent();
    return;
  }
  if (orderNumber && !LIMITS.orderNumberPattern.test(orderNumber)) {
    state.errorMsg = "Order number must use letters, numbers, and hyphens only (e.g. AQ-261125-4K9M), or leave blank.";
    renderModalContent();
    return;
  }

  const paymentId = "pay_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const paymentRef = generatePaymentRef();
  const profile = state.profile || {};
  const customerName =
    String(profile.displayName || state.user.displayName || depositorName || "Aqua Customer")
      .trim()
      .slice(0, LIMITS.displayNameMax) || "Aqua Customer";
  const customerEmail = String(profile.email || state.user.email || "member@aquapcparts.lk")
    .trim()
    .slice(0, LIMITS.emailMax);
  const customerPhone = String(profile.phone || "").trim().slice(0, LIMITS.phoneMax);

  const payload = {
    paymentId,
    paymentRef,
    ownerId: state.user.uid,
    customerName,
    customerEmail,
    amountLkr: Math.round(amountNum),
    paymentMethod,
    bankReference,
    depositorName,
    transferDate,
    status: "pending_verification",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (customerPhone && LIMITS.phonePattern.test(customerPhone)) {
    payload.customerPhone = customerPhone;
  }
  if (orderNumber) {
    payload.orderNumber = orderNumber;
  }
  if (note) {
    payload.note = note;
  }

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  const path = "payments/" + paymentId;
  try {
    await setDoc(doc(db, "payments", paymentId), payload);
    state.busy = false;
    state.pendingPaymentOrder = "";
    state.pendingPaymentAmount = "";
    state.successMsg =
      "Payment confirmation " +
      paymentRef +
      " submitted! Our Embilipitiya billing desk will verify your transfer and update the status live.";
    renderModalContent();
    showPageToast("Payment " + paymentRef + " submitted for verification");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (_) {
      state.errorMsg = "Could not submit payment confirmation. Please check all fields and try again.";
      renderModalContent();
    }
  }
}

async function cancelMyPayment(paymentId) {
  if (!state.user || !paymentId || state.busy) return;
  const path = "payments/" + paymentId;
  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();
  try {
    await updateDoc(doc(db, "payments", paymentId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });
    state.busy = false;
    state.successMsg = "Payment submission cancelled.";
    renderModalContent();
    showPageToast("Payment cancelled");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (_) {
      state.errorMsg = "Only pending payment submissions can be cancelled.";
      renderModalContent();
    }
  }
}

async function adminSaveBankDetails(raw) {
  if (!isAdminUser() || state.busy) return;
  const bankName = String(raw.bankName || "").trim().slice(0, LIMITS.bankNameMax);
  const accountName = String(raw.accountName || "").trim().slice(0, LIMITS.accountNameMax);
  const accountNumber = String(raw.accountNumber || "").trim().slice(0, LIMITS.accountNumberMax);
  const branch = String(raw.branch || "").trim().slice(0, LIMITS.branchMax);
  const swiftCode = String(raw.swiftCode || "").trim().slice(0, LIMITS.swiftCodeMax);
  const instructions = String(raw.instructions || "").trim().slice(0, LIMITS.instructionsMax);

  if (bankName.length < 2) {
    state.errorMsg = "Bank name must be at least 2 characters.";
    renderModalContent();
    return;
  }
  if (accountName.length < 2) {
    state.errorMsg = "Account holder name must be at least 2 characters.";
    renderModalContent();
    return;
  }
  if (accountNumber.length < 4 || !LIMITS.accountNumberPattern.test(accountNumber)) {
    state.errorMsg = "Account number must be 4-48 characters using letters, numbers, spaces, or hyphens only.";
    renderModalContent();
    return;
  }
  if (branch.length < 2) {
    state.errorMsg = "Bank branch must be at least 2 characters.";
    renderModalContent();
    return;
  }

  const payload = {
    bankName,
    accountName,
    accountNumber,
    branch,
    updatedBy: state.user.uid,
    updatedAt: serverTimestamp(),
  };
  if (swiftCode) payload.swiftCode = swiftCode;
  if (instructions) payload.instructions = instructions;

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  const path = "storeSettings/bankTransfer";
  try {
    await setDoc(doc(db, "storeSettings", "bankTransfer"), payload);
    state.busy = false;
    state.successMsg = "Official bank transfer details published! Visible strictly to signed-in buyers.";
    renderModalContent();
    showPageToast("Bank details published live");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (_) {
      state.errorMsg = "Could not save bank details. Ensure your admin email is verified.";
      renderModalContent();
    }
  }
}

async function adminUpdatePaymentStatus(paymentId, nextStatus, adminNoteRaw) {
  if (!isAdminUser() || !paymentId || state.busy) return;
  if (!LIMITS.validPaymentStatuses.includes(nextStatus)) return;
  const adminNote = String(adminNoteRaw || "").trim().slice(0, LIMITS.paymentNoteMax);
  const path = "payments/" + paymentId;

  state.busy = true;
  state.errorMsg = "";
  state.successMsg = "";
  renderModalContent();

  try {
    await updateDoc(doc(db, "payments", paymentId), {
      status: nextStatus,
      adminNote,
      updatedAt: serverTimestamp(),
    });
    state.busy = false;
    state.successMsg = "Payment updated to " + (PAYMENT_STATUS_LABELS[nextStatus] || nextStatus) + ".";
    renderModalContent();
    showPageToast("Payment status updated");
  } catch (error) {
    state.busy = false;
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (_) {
      state.errorMsg = "Could not update payment status.";
      renderModalContent();
    }
  }
}

// ───────── Printable Branded Invoice Modal (Zero window.open) ─────────
function openInvoiceModal(order) {
  if (!order) return;
  state.invoiceOrder = order;

  let host = document.getElementById("aqua-invoice-modal");
  if (!host) {
    host = document.createElement("div");
    host.id = "aqua-invoice-modal";
    host.className = "aqua-invoice-overlay";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-labelledby", "aqua-invoice-title");
    host.addEventListener("click", (e) => {
      if (e.target === host) closeInvoiceModal();
    });
    document.body.appendChild(host);
  }

  const lines = String(order.itemsSummary || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  host.innerHTML =
    '<div class="aqua-invoice-sheet">' +
    '<div class="aqua-invoice-toolbar no-print">' +
    '<span class="aqua-invoice-badge">OFFICIAL WORKSHOP INVOICE &amp; WARRANTY SLIP</span>' +
    '<div class="aqua-invoice-actions">' +
    '<button type="button" class="aqua-primary-btn" id="aqua-inv-print"><span class="material-symbols-outlined">print</span><span>Print / Save PDF</span></button>' +
    '<button type="button" class="aqua-auth-close is-inline" id="aqua-inv-close" aria-label="Close invoice"><span class="material-symbols-outlined">close</span></button>' +
    "</div></div>" +
    '<div class="aqua-invoice-paper">' +
    '<div class="aqua-inv-head">' +
    '<div class="aqua-inv-brand">' +
    '<img src="assets/logo.jpg" alt="Aqua PC Parts" />' +
    '<div><h2 id="aqua-invoice-title">AQUA PC PARTS</h2>' +
    "<p>Aqua PC Solutions · Hardware Superstore &amp; Lab<br/>Embilipitiya, Sri Lanka · Hotline / WhatsApp: +94 78 819 4535</p></div></div>" +
    '<div class="aqua-inv-meta">' +
    "<strong>INVOICE #" + esc(order.orderNumber || order.orderId) + "</strong>" +
    "<span>Issued: " + esc(fmtDate(order.createdAt)) + "</span>" +
    '<span class="aqua-inv-status">Status: ' + esc(String(order.status || "received").replace("_", " ").toUpperCase()) + "</span>" +
    "</div></div>" +
    '<div class="aqua-inv-client">' +
    '<div><small>BILLED TO</small><strong>' + esc(order.customerName || "Customer") + "</strong><span>" + esc(order.customerEmail || "") + "</span>" +
    (order.customerPhone ? "<span>Tel: " + esc(order.customerPhone) + "</span>" : "") + "</div>" +
    '<div><small>FULFILLMENT &amp; DESTINATION</small><strong>' + esc(FULFILL_LABELS[order.fulfillment] || "Showroom Pickup") + "</strong>" +
    "<span>" + esc(order.deliveryCity || "Embilipitiya Workshop Collection") + "</span></div>" +
    "</div>" +
    '<table class="aqua-inv-table"><thead><tr><th>#</th><th>Hardware Description &amp; SKU</th></tr></thead><tbody>' +
    lines
      .map(
        (line, idx) =>
          "<tr><td>" + (idx + 1) + "</td><td>" + esc(line.replace(/^\d+\.\s*/, "")) + "</td></tr>"
      )
      .join("") +
    "</tbody></table>" +
    '<div class="aqua-inv-totals">' +
    '<div><span>Items Count</span><strong>' + esc(String(order.itemCount || lines.length)) + " unit(s)</strong></div>" +
    '<div class="is-grand"><span>Total Payable (LKR)</span><strong>' + esc(fmtLKR(Number(order.totalLkr) || 0)) + "</strong></div>" +
    "</div>" +
    (order.statusNote
      ? '<div class="aqua-inv-tech-note"><strong>Workshop Telemetry Note:</strong> ' + esc(order.statusNote) + "</div>"
      : "") +
    '<div class="aqua-inv-warranty">' +
    '<div><strong>06-Month Written Testing Warranty (Used Grade-A) · Official Brand Warranty (Sealed New)</strong>' +
    "<p>All used GPUs, CPUs &amp; motherboards undergo 24-hour FurMark / stability verification before dispatch. Retain this invoice and original SKU seal for warranty service.</p></div>" +
    '<div class="aqua-inv-stamp">LAB VERIFIED<br/>AQUA PC PARTS</div>' +
    "</div>" +
    "</div></div>";

  host.hidden = false;
  host.classList.add("open");
  document.body.classList.add("aqua-printing-invoice");

  const closeBtn = host.querySelector("#aqua-inv-close");
  if (closeBtn) closeBtn.addEventListener("click", closeInvoiceModal);

  const printBtn = host.querySelector("#aqua-inv-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

function closeInvoiceModal() {
  const host = document.getElementById("aqua-invoice-modal");
  if (host) {
    host.hidden = true;
    host.classList.remove("open");
  }
  document.body.classList.remove("aqua-printing-invoice");
  state.invoiceOrder = null;
}

function buildQuoteWhatsAppHref(q) {
  const lines = [
    "Hello Aqua PC Parts!",
    "Saved Client Quote: " + (q.title || "PC Build Quote"),
    state.profile && state.profile.displayName ? "Customer: " + state.profile.displayName : "",
    state.profile && state.profile.city ? "Delivery City: " + state.profile.city : "",
    "",
    q.summary || "",
    "",
    "Estimated Total: " + fmtLKR(q.totalLkr || 0),
  ].filter(Boolean);
  return "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(lines.join("\n"));
}

function buildOrderWhatsAppHref(o) {
  const lines = [
    "Hello Aqua PC Parts! Checking on my tracked order:",
    "Order #: " + (o.orderNumber || o.orderId),
    "Status: " + String(o.status || "received").replace("_", " ").toUpperCase(),
    "Customer: " + (o.customerName || ""),
    o.deliveryCity ? "City: " + o.deliveryCity : "",
    "",
    o.itemsSummary || "",
    "",
    "Total: " + fmtLKR(Number(o.totalLkr) || 0),
  ].filter(Boolean);
  return "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(lines.join("\n"));
}

function googleGIcon() {
  return (
    '<svg class="aqua-google-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"/>' +
    '<path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24Z"/>' +
    '<path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09Z"/>' +
    '<path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.955 1.19 15.245 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"/>' +
    "</svg>"
  );
}

function facebookFIcon() {
  return (
    '<svg class="aqua-facebook-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073Z"/>' +
    "</svg>"
  );
}

// ───────── DOM Mounting & Rendering ─────────
function ensureHeaderSlot() {
  const neActions = document.querySelector(".ne-header-actions");
  const stdActions = document.querySelector(".header-actions");
  const s3dActions = document.querySelector(".s3d-corner-right");
  const container = neActions || stdActions || s3dActions;

  let slot = document.getElementById("aqua-auth-slot");
  if (!slot) {
    if (!container) return null;
    slot = document.createElement("div");
    slot.id = "aqua-auth-slot";
    slot.className = neActions ? "aqua-auth-slot is-ne" : "aqua-auth-slot is-std";
    const cartBtn = container.querySelector("#cart-open");
    if (cartBtn) {
      container.insertBefore(slot, cartBtn);
    } else {
      container.appendChild(slot);
    }
  }

  if (container && !document.getElementById("aqua-track-open-btn")) {
    const trackBtn = document.createElement("button");
    trackBtn.type = "button";
    trackBtn.id = "aqua-track-open-btn";
    trackBtn.className = neActions ? "aqua-track-nav-btn is-ne" : "aqua-track-nav-btn is-std";
    trackBtn.setAttribute("aria-label", "Track your order status");
    trackBtn.title = "Track your Aqua PC Parts order status";
    trackBtn.innerHTML =
      '<span class="material-symbols-outlined">local_shipping</span>' +
      '<span class="aqua-track-btn-label">Track Order</span>';
    trackBtn.addEventListener("click", () => openTrackOrderModal());
    if (slot.parentNode === container) {
      container.insertBefore(trackBtn, slot);
    } else {
      const cartBtn = container.querySelector("#cart-open");
      if (cartBtn) container.insertBefore(trackBtn, cartBtn);
      else container.appendChild(trackBtn);
    }
  }

  const offcanvasLinks = document.querySelector(".ne-offcanvas-quicklinks");
  if (offcanvasLinks && !document.getElementById("aqua-mobile-payment-link")) {
    const payLink = document.createElement("a");
    payLink.id = "aqua-mobile-payment-link";
    payLink.href = "#payment-portal";
    payLink.innerHTML = "<span>Payment Portal (Members Only)</span>";
    payLink.addEventListener("click", (e) => {
      e.preventDefault();
      const closeBtn = document.getElementById("offcanvas-close");
      if (closeBtn) closeBtn.click();
      openPaymentPortal();
    });
    offcanvasLinks.insertBefore(payLink, offcanvasLinks.firstChild);
  }

  if (offcanvasLinks && !document.getElementById("aqua-mobile-track-link")) {
    const trackLink = document.createElement("a");
    trackLink.id = "aqua-mobile-track-link";
    trackLink.href = "#track-order";
    trackLink.innerHTML = "<span>Track Order by Number</span>";
    trackLink.addEventListener("click", (e) => {
      e.preventDefault();
      const closeBtn = document.getElementById("offcanvas-close");
      if (closeBtn) closeBtn.click();
      openTrackOrderModal();
    });
    offcanvasLinks.insertBefore(trackLink, offcanvasLinks.firstChild);
  }

  if (offcanvasLinks && !document.getElementById("aqua-mobile-auth-link")) {
    const a = document.createElement("a");
    a.id = "aqua-mobile-auth-link";
    a.href = "#account";
    a.innerHTML = "<span>Client Sign In / Portal</span>";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const closeBtn = document.getElementById("offcanvas-close");
      if (closeBtn) closeBtn.click();
      openModal(state.user ? "orders" : "signin");
    });
    offcanvasLinks.insertBefore(a, offcanvasLinks.firstChild);
  }

  return slot;
}

function renderHeaderSlot() {
  const slot = ensureHeaderSlot();
  if (!slot) return;

  const mobileLink = document.getElementById("aqua-mobile-auth-link");
  if (mobileLink) {
    mobileLink.innerHTML = state.user
      ? "<span>👤 " + esc(getFirstName(state.user, state.profile)) + " · Orders &amp; Portal</span>"
      : "<span>🔐 Client Sign In / Order Tracker</span>";
  }

  document.querySelectorAll(".ne-topbar-auth[data-aqua-open-auth]").forEach((el) => {
    el.textContent = state.user
      ? "Account (" + getFirstName(state.user, state.profile) + ")"
      : "Sign In / Register";
  });

  if (!state.user) {
    slot.innerHTML =
      '<button type="button" class="aqua-auth-btn" id="aqua-auth-open-btn" aria-label="Sign in to Aqua PC Parts">' +
      '<span class="material-symbols-outlined">login</span>' +
      '<span class="aqua-auth-btn-label">Sign In</span>' +
      "</button>";

    const btn = slot.querySelector("#aqua-auth-open-btn");
    if (btn) btn.addEventListener("click", () => openModal("signin"));
    return;
  }

  const firstName = getFirstName(state.user, state.profile);
  const fullName = (state.profile && state.profile.displayName) || state.user.displayName || "Aqua Member";
  const email = (state.profile && state.profile.email) || state.user.email || "";
  const photo = (state.profile && state.profile.photoURL) || state.user.photoURL || "";
  const initials = getInitials(state.user, state.profile);
  const quoteBadge = state.quotes.length > 0 ? '<span class="aqua-menu-count">' + state.quotes.length + "</span>" : "";
  const orderBadge = state.orders.length > 0 ? '<span class="aqua-menu-count">' + state.orders.length + "</span>" : "";
  const paymentBadge = state.payments.length > 0 ? '<span class="aqua-menu-count">' + state.payments.length + "</span>" : "";
  const adminItem = isAdminUser()
    ? '<button type="button" class="aqua-menu-item is-admin" data-aqua-action="portal-admin" role="menuitem">' +
      '<span class="material-symbols-outlined">admin_panel_settings</span>' +
      "<span>Workshop Admin Desk</span></button>"
    : "";

  slot.innerHTML =
    '<div class="aqua-user-wrap">' +
    '<button type="button" class="aqua-user-btn" id="aqua-user-menu-btn" aria-expanded="' +
    (state.menuOpen ? "true" : "false") +
    '" aria-haspopup="menu">' +
    (photo
      ? '<img class="aqua-user-avatar" src="' + esc(photo) + '" alt="" referrerpolicy="no-referrer" />'
      : '<span class="aqua-user-avatar is-initials">' + esc(initials) + "</span>") +
    '<span class="aqua-user-name">' + esc(firstName) + "</span>" +
    '<span class="material-symbols-outlined aqua-user-caret">expand_more</span>' +
    "</button>" +
    '<div class="aqua-user-menu' + (state.menuOpen ? " open" : "") + '" id="aqua-user-dropdown" role="menu">' +
    '<div class="aqua-user-menu-head">' +
    '<span class="aqua-verified-tag">' + getProviderBadgeLabel(state.user, false) + "</span>" +
    '<strong class="aqua-menu-fullname">' + esc(fullName) + "</strong>" +
    '<span class="aqua-menu-email">' + esc(email) + "</span>" +
    "</div>" +
    '<button type="button" class="aqua-menu-item" data-aqua-action="portal-orders" role="menuitem">' +
    '<span class="material-symbols-outlined">receipt_long</span>' +
    "<span>Orders &amp; Invoices</span>" +
    orderBadge +
    "</button>" +
    '<button type="button" class="aqua-menu-item is-pay" data-aqua-action="portal-payments" role="menuitem">' +
    '<span class="material-symbols-outlined">account_balance</span>' +
    "<span>Payment Portal &amp; Bank</span>" +
    paymentBadge +
    "</button>" +
    '<button type="button" class="aqua-menu-item" data-aqua-action="track-order" role="menuitem">' +
    '<span class="material-symbols-outlined">local_shipping</span>' +
    "<span>Track by Order #</span>" +
    "</button>" +
    '<button type="button" class="aqua-menu-item" data-aqua-action="portal-quotes" role="menuitem">' +
    '<span class="material-symbols-outlined">bookmark</span>' +
    "<span>Saved Quotes</span>" +
    quoteBadge +
    "</button>" +
    '<button type="button" class="aqua-menu-item" data-aqua-action="portal-profile" role="menuitem">' +
    '<span class="material-symbols-outlined">account_circle</span>' +
    "<span>Profile &amp; Delivery</span>" +
    "</button>" +
    adminItem +
    '<a class="aqua-menu-item" href="' + MAIN_SITE_ACCOUNT_URL + '" target="_blank" rel="noopener noreferrer" role="menuitem">' +
    '<span class="material-symbols-outlined">open_in_new</span>' +
    "<span>Aqua PC Solutions Portal</span>" +
    "</a>" +
    '<div class="aqua-menu-sep"></div>' +
    '<button type="button" class="aqua-menu-item is-danger" data-aqua-action="signout" role="menuitem">' +
    '<span class="material-symbols-outlined">logout</span>' +
    "<span>Sign Out</span>" +
    "</button>" +
    "</div>" +
    "</div>";

  const toggleBtn = slot.querySelector("#aqua-user-menu-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.menuOpen = !state.menuOpen;
      renderHeaderSlot();
    });
  }

  slot.querySelectorAll("[data-aqua-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const act = el.getAttribute("data-aqua-action");
      state.menuOpen = false;
      renderHeaderSlot();
      if (act === "portal-profile") openModal("profile");
      else if (act === "portal-quotes") openModal("quotes");
      else if (act === "portal-orders") openModal("orders");
      else if (act === "portal-payments") openPaymentPortal();
      else if (act === "portal-admin") openModal("admin");
      else if (act === "track-order") openTrackOrderModal();
      else if (act === "signout") handleSignOut();
    });
  });
}

function ensureModalHost() {
  let host = document.getElementById("aqua-auth-modal");
  if (host) return host;

  host = document.createElement("div");
  host.id = "aqua-auth-modal";
  host.className = "aqua-auth-overlay";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-labelledby", "aqua-auth-modal-title");
  host.hidden = true;

  host.addEventListener("click", (e) => {
    if (e.target === host) closeModal();
  });

  document.body.appendChild(host);
  return host;
}

function syncModalVisibility() {
  const host = ensureModalHost();
  host.hidden = !state.modalOpen;
  host.classList.toggle("open", state.modalOpen);
  document.body.classList.toggle("aqua-modal-open", state.modalOpen);
}

function openModal(modeOrTab, opts) {
  state.menuOpen = false;
  state.errorMsg = "";
  state.successMsg = "";
  if (!opts || !opts.keepPaymentGate) {
    state.paymentGateNotice = false;
    state.pendingPaymentRedirect = false;
  }
  if (modeOrTab === "signin" || modeOrTab === "register" || modeOrTab === "reset") {
    state.authMode = modeOrTab;
  } else if (["quotes", "profile", "orders", "payments", "admin"].includes(modeOrTab)) {
    state.portalTab = modeOrTab;
  }
  state.modalOpen = true;
  renderHeaderSlot();
  renderModalContent();
  syncModalVisibility();
}

function openPaymentPortal(orderNumber, amountLkr) {
  const cleanOrder = typeof orderNumber === "string" ? orderNumber.trim().toUpperCase() : "";
  if (cleanOrder) {
    state.pendingPaymentOrder = cleanOrder;
  }
  if (typeof amountLkr === "number" && Number.isFinite(amountLkr) && amountLkr > 0) {
    state.pendingPaymentAmount = String(Math.round(amountLkr));
  }

  if (!state.user) {
    state.paymentGateNotice = true;
    state.pendingPaymentRedirect = true;
    openModal("register", { keepPaymentGate: true });
    return;
  }

  state.paymentGateNotice = false;
  state.pendingPaymentRedirect = false;
  openModal("payments");
}

function closeModal() {
  state.modalOpen = false;
  state.paymentGateNotice = false;
  state.pendingPaymentRedirect = false;
  state.errorMsg = "";
  state.successMsg = "";
  syncModalVisibility();
}

function renderOrderProgressBar(status) {
  if (status === "cancelled") {
    return '<div class="aqua-order-cancelled"><span class="material-symbols-outlined">cancel</span><span>Order Cancelled</span></div>';
  }
  const activeIdx = Math.max(0, ORDER_STAGES.findIndex((s) => s.key === status));
  return (
    '<div class="aqua-order-stepper" aria-label="Order progress">' +
    ORDER_STAGES.map((st, idx) => {
      const done = idx <= activeIdx;
      const current = idx === activeIdx;
      return (
        '<div class="aqua-step' +
        (done ? " is-done" : "") +
        (current ? " is-current" : "") +
        '">' +
        '<span class="aqua-step-dot"><span class="material-symbols-outlined">' +
        st.icon +
        "</span></span>" +
        "<small>" +
        esc(st.shortLabel || st.label) +
        "</small>" +
        "</div>"
      );
    }).join("") +
    "</div>"
  );
}

function renderModalContent() {
  const host = ensureModalHost();

  const feedbackHtml =
    (state.errorMsg
      ? '<div class="aqua-alert is-error" role="alert"><span class="material-symbols-outlined">error</span><span>' +
        esc(state.errorMsg) +
        "</span></div>"
      : "") +
    (state.successMsg
      ? '<div class="aqua-alert is-success" role="status"><span class="material-symbols-outlined">check_circle</span><span>' +
        esc(state.successMsg) +
        "</span></div>"
      : "");

  if (!state.user) {
    const isReg = state.authMode === "register";
    const isReset = state.authMode === "reset";
    const headingTitle = isReset
      ? "Reset Your Password"
      : isReg
        ? "Create Aqua Account"
        : "Sign In to Your Account";
    const headingSub = isReset
      ? "Enter the email associated with your Aqua PC Parts account and we'll send a secure password reset link."
      : isReg
        ? "Sign up with Email, Google, or Facebook to track live bench-test orders, print LKR invoices, and sync PC quotes."
        : "Sign in with Email, Google, or Facebook to track live workshop orders, print warranty invoices, and sync quotes.";

    const emailFormHtml = isReset
      ? '<form class="aqua-email-form" id="aqua-reset-form" novalidate>' +
        '<div class="aqua-field">' +
        '<label for="aqua-auth-email">Account Email Address</label>' +
        '<input type="email" id="aqua-auth-email" autocomplete="email" placeholder="you@example.com" value="' + esc(state.draftEmail) + '" required />' +
        "</div>" +
        '<button type="submit" class="aqua-submit-btn"' +
        (state.busy ? " disabled" : "") +
        ">" +
        '<span class="material-symbols-outlined">mail</span>' +
        "<span>" + (state.busy ? "Sending Reset Link..." : "Send Password Reset Link") + "</span>" +
        "</button>" +
        '<div class="aqua-forgot-row">' +
        '<button type="button" class="aqua-text-link" data-auth-mode="signin">← Back to Sign In</button>' +
        "</div>" +
        "</form>"
      : '<form class="aqua-email-form" id="aqua-email-form" novalidate>' +
        (isReg
          ? '<div class="aqua-field">' +
            '<label for="aqua-auth-name">Full Name</label>' +
            '<input type="text" id="aqua-auth-name" autocomplete="name" maxlength="100" placeholder="e.g. Kasun Perera" value="' + esc(state.draftName) + '" required />' +
            "</div>"
          : "") +
        '<div class="aqua-field">' +
        '<label for="aqua-auth-email">Email Address</label>' +
        '<input type="email" id="aqua-auth-email" autocomplete="email" maxlength="254" placeholder="you@example.com" value="' + esc(state.draftEmail) + '" required />' +
        "</div>" +
        '<div class="aqua-field">' +
        '<div class="aqua-label-row">' +
        '<label for="aqua-auth-pass">Password</label>' +
        (!isReg
          ? '<button type="button" class="aqua-text-link" data-auth-mode="reset">Forgot password?</button>'
          : '<span class="aqua-field-hint">Min. 6 characters</span>') +
        "</div>" +
        '<div class="aqua-pass-wrap">' +
        '<input type="password" id="aqua-auth-pass" autocomplete="' +
        (isReg ? "new-password" : "current-password") +
        '" minlength="6" placeholder="' +
        (isReg ? "Create a password" : "Enter your password") +
        '" required />' +
        '<button type="button" class="aqua-pass-toggle" id="aqua-pass-toggle" aria-label="Show or hide password">' +
        '<span class="material-symbols-outlined">visibility</span>' +
        "</button>" +
        "</div>" +
        "</div>" +
        '<button type="submit" class="aqua-submit-btn"' +
        (state.busy ? " disabled" : "") +
        ">" +
        '<span class="material-symbols-outlined">' + (isReg ? "person_add" : "login") + "</span>" +
        "<span>" +
        (state.busy
          ? isReg
            ? "Creating Account..."
            : "Signing In..."
          : isReg
            ? "Create Account with Email"
            : "Sign In with Email") +
        "</span>" +
        "</button>" +
        "</form>";

    const paymentGateBanner = state.paymentGateNotice
      ? '<div class="aqua-pay-gate-banner" role="note">' +
        '<span class="material-symbols-outlined">lock</span>' +
        "<div>" +
        "<strong>Registration Required for Payment Portal</strong>" +
        "<p>Create a free Aqua PC Parts account or sign in below to view our official bank transfer details and submit payment confirmations.</p>" +
        "</div>" +
        "</div>"
      : "";

    host.innerHTML =
      '<div class="aqua-auth-card">' +
      '<button type="button" class="aqua-auth-close" id="aqua-modal-close" aria-label="Close login panel">' +
      '<span class="material-symbols-outlined">close</span>' +
      "</button>" +
      '<div class="aqua-auth-head">' +
      '<div class="aqua-auth-brand">' +
      '<img src="assets/logo.jpg" alt="Aqua PC Solutions" />' +
      "<div>" +
      '<span class="aqua-auth-eyebrow">' +
      (state.paymentGateNotice ? "REGISTERED BUYERS PAYMENT PORTAL" : "AQUA LAB CLIENT ACCESS") +
      "</span>" +
      '<h2 id="aqua-auth-modal-title">' + headingTitle + "</h2>" +
      "</div>" +
      "</div>" +
      '<p class="aqua-auth-sub">' + headingSub + "</p>" +
      "</div>" +
      paymentGateBanner +
      '<div class="aqua-mode-tabs" role="tablist" aria-label="Authentication mode">' +
      '<button type="button" role="tab" aria-selected="' +
      (!isReg && !isReset ? "true" : "false") +
      '" class="aqua-mode-tab' +
      (!isReg && !isReset ? " active" : "") +
      '" data-auth-mode="signin">' +
      '<span class="material-symbols-outlined">login</span><span>Sign In</span>' +
      "</button>" +
      '<button type="button" role="tab" aria-selected="' +
      (isReg ? "true" : "false") +
      '" class="aqua-mode-tab' +
      (isReg ? " active" : "") +
      '" data-auth-mode="register">' +
      '<span class="material-symbols-outlined">person_add</span><span>Create Account</span>' +
      "</button>" +
      "</div>" +
      feedbackHtml +
      emailFormHtml +
      '<div class="aqua-auth-divider"><span>OR CONTINUE WITH</span></div>' +
      '<div class="aqua-social-stack">' +
      '<button type="button" class="aqua-google-btn" id="aqua-google-signin-btn"' +
      (state.busy ? " disabled" : "") +
      ">" +
      googleGIcon() +
      "<span>" +
      (state.busy ? "Connecting..." : isReg ? "Sign Up with Google" : "Continue with Google") +
      "</span>" +
      "</button>" +
      '<button type="button" class="aqua-facebook-btn" id="aqua-facebook-signin-btn"' +
      (state.busy ? " disabled" : "") +
      ">" +
      facebookFIcon() +
      "<span>" +
      (state.busy ? "Connecting..." : isReg ? "Sign Up with Facebook" : "Continue with Facebook") +
      "</span>" +
      "</button>" +
      "</div>" +
      '<div class="aqua-auth-divider"><span>AQUA MEMBER PERKS</span></div>' +
      '<div class="aqua-perks-grid">' +
      '<div class="aqua-perk"><span class="material-symbols-outlined">local_shipping</span><div><strong>Live Tracking</strong><small>Bench test to courier</small></div></div>' +
      '<div class="aqua-perk"><span class="material-symbols-outlined">receipt_long</span><div><strong>PDF Invoices</strong><small>SKU &amp; warranty slip</small></div></div>' +
      '<div class="aqua-perk"><span class="material-symbols-outlined">cloud_done</span><div><strong>Cloud Quotes</strong><small>Sync builds anywhere</small></div></div>' +
      "</div>" +
      (state.recaptchaActive
        ? '<p class="aqua-recaptcha-note">Protected by reCAPTCHA Enterprise &middot; ' +
          '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> &middot; ' +
          '<a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a></p>'
        : "") +
      '<div class="aqua-auth-foot">' +
      '<a href="https://aquapcsolutions.yyth.workers.dev/" target="_blank" rel="noopener noreferrer">Aqua PC Solutions Main Site ↗</a>' +
      '<a href="./admin.html" class="aqua-staff-link">Store Admin Console →</a>' +
      "</div>" +
      "</div>";

    const closeBtn = host.querySelector("#aqua-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    const nameInput = host.querySelector("#aqua-auth-name");
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        state.draftName = nameInput.value;
      });
    }
    const emailInput = host.querySelector("#aqua-auth-email");
    if (emailInput) {
      emailInput.addEventListener("input", () => {
        state.draftEmail = emailInput.value;
      });
    }

    host.querySelectorAll("[data-auth-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.busy) return;
        state.authMode = btn.getAttribute("data-auth-mode") || "signin";
        state.errorMsg = "";
        state.successMsg = "";
        renderModalContent();
      });
    });

    const passToggle = host.querySelector("#aqua-pass-toggle");
    const passInput = host.querySelector("#aqua-auth-pass");
    if (passToggle && passInput) {
      passToggle.addEventListener("click", () => {
        const show = passInput.type === "password";
        passInput.type = show ? "text" : "password";
        const icon = passToggle.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = show ? "visibility_off" : "visibility";
      });
    }

    const emailForm = host.querySelector("#aqua-email-form");
    if (emailForm) {
      emailForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const emailVal = (host.querySelector("#aqua-auth-email") || {}).value;
        const passVal = (host.querySelector("#aqua-auth-pass") || {}).value;
        if (isReg) {
          const nameVal = (host.querySelector("#aqua-auth-name") || {}).value;
          registerWithEmail(nameVal, emailVal, passVal);
        } else {
          signInWithEmail(emailVal, passVal);
        }
      });
    }

    const resetForm = host.querySelector("#aqua-reset-form");
    if (resetForm) {
      resetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const emailVal = (host.querySelector("#aqua-auth-email") || {}).value;
        resetPasswordWithEmail(emailVal);
      });
    }

    const gBtn = host.querySelector("#aqua-google-signin-btn");
    if (gBtn) gBtn.addEventListener("click", signInWithGoogle);

    const fbBtn = host.querySelector("#aqua-facebook-signin-btn");
    if (fbBtn) fbBtn.addEventListener("click", signInWithFacebook);
    return;
  }

  // Signed-in Customer Portal view
  const profile = state.profile || {};
  const fullName = profile.displayName || state.user.displayName || "Aqua Member";
  const email = profile.email || state.user.email || "";
  const photo = profile.photoURL || state.user.photoURL || "";
  const initials = getInitials(state.user, profile);
  const cartSnap = readLocalCartSnapshot();
  const cartCount = cartSnap.items.reduce((s, i) => s + i.qty, 0);
  const admin = isAdminUser();
  const tab = state.portalTab === "admin" && !admin ? "orders" : state.portalTab;

  const profileBody =
    '<form class="aqua-portal-form" id="aqua-profile-form">' +
    '<div class="aqua-field">' +
    '<label for="aqua-prof-name">Display Name</label>' +
    '<input id="aqua-prof-name" type="text" maxlength="' + LIMITS.displayNameMax + '" value="' + esc(fullName) + '" required />' +
    "</div>" +
    '<div class="aqua-field-row">' +
    '<div class="aqua-field">' +
    '<label for="aqua-prof-phone">WhatsApp / Contact Number</label>' +
    '<input id="aqua-prof-phone" type="tel" maxlength="' + LIMITS.phoneMax + '" placeholder="+94 7X XXX XXXX" value="' + esc(profile.phone || "") + '" />' +
    "</div>" +
    '<div class="aqua-field">' +
    '<label for="aqua-prof-city">Delivery City (Sri Lanka)</label>' +
    '<input id="aqua-prof-city" type="text" maxlength="' + LIMITS.cityMax + '" placeholder="e.g. Embilipitiya, Colombo" value="' + esc(profile.city || "") + '" />' +
    "</div>" +
    "</div>" +
    '<button type="submit" class="aqua-primary-btn"' + (state.busy ? " disabled" : "") + ">" +
    '<span class="material-symbols-outlined">save</span>' +
    "<span>" + (state.busy ? "Saving Profile..." : "Save Profile Changes") + "</span>" +
    "</button>" +
    "</form>";

  const quotesBody =
    '<div class="aqua-save-quote-bar">' +
    '<input id="aqua-quote-title-input" type="text" maxlength="' + LIMITS.quoteTitleMax + '" placeholder="Quote label (e.g. RTX 3060 Gaming Build)" />' +
    '<button type="button" class="aqua-primary-btn" id="aqua-save-cart-btn"' + (state.busy ? " disabled" : "") + ">" +
    '<span class="material-symbols-outlined">bookmark_add</span>' +
    "<span>Save Cart (" + cartCount + ")</span>" +
    "</button>" +
    "</div>" +
    (state.quotes.length === 0
      ? '<div class="aqua-empty-quotes"><span class="material-symbols-outlined">inventory_2</span><p>No saved quotes yet. Add PC parts to your Cart and save a cloud snapshot here.</p></div>'
      : '<div class="aqua-quotes-list">' +
        state.quotes
          .map(
            (q) =>
              '<div class="aqua-quote-item">' +
              '<div class="aqua-quote-item-top">' +
              "<div><strong>" + esc(q.title) + "</strong><small>" + esc(String(q.itemCount || 1)) + " item(s) · " + esc(fmtLKR(q.totalLkr || 0)) + "</small></div>" +
              '<div class="aqua-quote-item-btns">' +
              '<button type="button" class="aqua-mini-btn is-order" data-quote-to-order="' + esc(q.id) + '" title="Place tracked workshop order"><span class="material-symbols-outlined">local_shipping</span><span>Track Order</span></button>' +
              '<a class="aqua-mini-btn is-wa" href="' + esc(buildQuoteWhatsAppHref(q)) + '" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">send</span><span>WhatsApp</span></a>' +
              '<button type="button" class="aqua-mini-btn is-del" data-del-quote="' + esc(q.id) + '" aria-label="Delete saved quote"><span class="material-symbols-outlined">delete</span></button>' +
              "</div></div>" +
              '<pre class="aqua-quote-summary">' + esc(q.summary || "") + "</pre>" +
              "</div>"
          )
          .join("") +
        "</div>");

  const ordersBody =
    '<div class="aqua-order-create-bar">' +
    '<div class="aqua-order-create-row">' +
    '<select id="aqua-order-fulfill" aria-label="Fulfillment method">' +
    '<option value="pickup"' + (state.orderFulfillment === "pickup" ? " selected" : "") + ">Showroom Pickup (Embilipitiya)</option>" +
    '<option value="courier"' + (state.orderFulfillment === "courier" ? " selected" : "") + ">Island-Wide ESD Courier</option>" +
    '<option value="install"' + (state.orderFulfillment === "install" ? " selected" : "") + ">Workshop Build &amp; 24h Stress Test</option>" +
    "</select>" +
    '<button type="button" class="aqua-primary-btn" id="aqua-place-order-btn"' + (state.busy ? " disabled" : "") + ">" +
    '<span class="material-symbols-outlined">add_shopping_cart</span>' +
    "<span>Submit Cart as Order (" + cartCount + ")</span>" +
    "</button>" +
    "</div>" +
    (cartCount > 0
      ? '<small class="aqua-order-hint">Current Cart Total: <strong>' + esc(fmtLKR(cartSnap.totalLkr)) + "</strong> · Live workshop updates &amp; printable invoice included.</small>"
      : '<small class="aqua-order-hint">Add hardware parts to your Cart (or convert a Saved Quote) to track live bench testing &amp; delivery.</small>') +
    "</div>" +
    (state.orders.length === 0
      ? '<div class="aqua-empty-quotes"><span class="material-symbols-outlined">local_shipping</span><p>No tracked orders yet. Submit your current Cart above to receive a live Aqua Order # and printable invoice.</p></div>'
      : '<div class="aqua-orders-list">' +
        state.orders
          .map(
            (o) =>
              '<div class="aqua-order-card">' +
              '<div class="aqua-order-card-top">' +
              '<div><strong class="aqua-order-num">' + esc(o.orderNumber || o.orderId) + "</strong>" +
              "<small>" + esc(fmtDate(o.createdAt)) + " · " + esc(String(o.itemCount || 1)) + " item(s) · <b>" + esc(fmtLKR(Number(o.totalLkr) || 0)) + "</b></small></div>" +
              '<div class="aqua-quote-item-btns">' +
              (o.status !== "cancelled"
                ? '<button type="button" class="aqua-mini-btn is-pay" data-pay-order="' + esc(o.id) + '" title="Pay via Bank Transfer"><span class="material-symbols-outlined">account_balance</span><span>Pay</span></button>'
                : "") +
              '<button type="button" class="aqua-mini-btn is-inv" data-print-order="' + esc(o.id) + '"><span class="material-symbols-outlined">receipt_long</span><span>Invoice</span></button>' +
              '<a class="aqua-mini-btn is-wa" href="' + esc(buildOrderWhatsAppHref(o)) + '" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">chat</span></a>' +
              (o.status === "received"
                ? '<button type="button" class="aqua-mini-btn is-del" data-cancel-order="' + esc(o.id) + '" title="Cancel newly received order"><span class="material-symbols-outlined">cancel</span></button>'
                : "") +
              "</div></div>" +
              renderOrderProgressBar(o.status) +
              (o.statusNote
                ? '<div class="aqua-order-tech-note"><span class="material-symbols-outlined">biotech</span><span>' + esc(o.statusNote) + "</span></div>"
                : "") +
              '<pre class="aqua-quote-summary">' + esc(o.itemsSummary || "") + "</pre>" +
              "</div>"
          )
          .join("") +
        "</div>");

  // ── Login-Gated Buyer Payment Portal Tab ──
  const bd = state.bankDetails;
  const prefillOrder = state.pendingPaymentOrder || "";
  const prefillAmount =
    state.pendingPaymentAmount ||
    (prefillOrder
      ? (() => {
          const m = state.orders.find((o) => String(o.orderNumber || "").toUpperCase() === prefillOrder);
          return m && Number(m.totalLkr) > 0 ? String(Math.round(Number(m.totalLkr))) : "";
        })()
      : cartSnap.totalLkr > 0
        ? String(Math.round(cartSnap.totalLkr))
        : "");

  const bankCardHtml = !state.bankDetailsLoaded
    ? '<div class="aqua-bank-card is-loading"><span class="material-symbols-outlined aqua-spin">progress_activity</span><span>Loading official bank transfer details...</span></div>'
    : bd
      ? '<div class="aqua-bank-card">' +
        '<div class="aqua-bank-card-head">' +
        '<div><span class="aqua-bank-eyebrow"><span class="material-symbols-outlined">verified_user</span> MEMBERS-ONLY OFFICIAL BANK ACCOUNT</span>' +
        "<h4>" + esc(bd.bankName) + "</h4></div>" +
        '<button type="button" class="aqua-mini-btn is-inv" id="aqua-copy-all-bank"><span class="material-symbols-outlined">content_copy</span><span>Copy All</span></button>' +
        "</div>" +
        '<div class="aqua-bank-grid">' +
        '<div class="aqua-bank-row"><small>Account Holder Name</small><div class="aqua-bank-val"><strong>' + esc(bd.accountName) + '</strong><button type="button" class="aqua-copy-icon-btn" data-copy-bank="' + esc(bd.accountName) + '" data-copy-label="Account Name" aria-label="Copy account name"><span class="material-symbols-outlined">content_copy</span></button></div></div>' +
        '<div class="aqua-bank-row"><small>Account Number</small><div class="aqua-bank-val"><strong class="aqua-bank-mono">' + esc(bd.accountNumber) + '</strong><button type="button" class="aqua-copy-icon-btn" data-copy-bank="' + esc(bd.accountNumber) + '" data-copy-label="Account Number" aria-label="Copy account number"><span class="material-symbols-outlined">content_copy</span></button></div></div>' +
        '<div class="aqua-bank-row"><small>Branch</small><div class="aqua-bank-val"><strong>' + esc(bd.branch) + "</strong></div></div>" +
        (bd.swiftCode
          ? '<div class="aqua-bank-row"><small>Bank / SWIFT Code</small><div class="aqua-bank-val"><strong class="aqua-bank-mono">' + esc(bd.swiftCode) + '</strong><button type="button" class="aqua-copy-icon-btn" data-copy-bank="' + esc(bd.swiftCode) + '" data-copy-label="SWIFT Code" aria-label="Copy SWIFT code"><span class="material-symbols-outlined">content_copy</span></button></div></div>'
          : "") +
        "</div>" +
        (bd.instructions
          ? '<div class="aqua-bank-instructions"><span class="material-symbols-outlined">info</span><p>' + esc(bd.instructions) + "</p></div>"
          : "") +
        "</div>"
      : '<div class="aqua-bank-card is-pending">' +
        '<div class="aqua-bank-pending-head">' +
        '<span class="material-symbols-outlined">account_balance</span>' +
        "<div>" +
        "<h4>Official Bank Details Pending Setup</h4>" +
        "<p>Official bank transfer details are being finalized by the Aqua PC Parts billing desk. Once published, they will appear right here for registered members.</p>" +
        "</div>" +
        "</div>" +
        '<div class="aqua-bank-pending-actions">' +
        (admin
          ? '<button type="button" class="aqua-primary-btn" id="aqua-goto-admin-bank"><span class="material-symbols-outlined">edit_note</span><span>Set Up Bank Details in Admin Tab</span></button>'
          : '<a class="aqua-mini-btn is-wa" href="https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent("Hello Aqua PC Parts! I am logged in to my account (" + email + ") and would like to confirm bank transfer details for my order.") + '" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">chat</span><span>Confirm Bank Details on WhatsApp</span></a>') +
        "</div>" +
        "</div>";

  const orderPickerOptions =
    '<option value="">Direct / Cart Payment (no order selected)</option>' +
    state.orders
      .filter((o) => o.status !== "cancelled")
      .map((o) => {
        const num = String(o.orderNumber || o.orderId || "").toUpperCase();
        const sel = prefillOrder && num === prefillOrder ? " selected" : "";
        return (
          '<option value="' + esc(num) + '" data-amt="' + esc(String(Math.round(Number(o.totalLkr) || 0))) + '"' + sel + ">" +
          esc(num) + " — " + esc(fmtLKR(Number(o.totalLkr) || 0)) +
          "</option>"
        );
      })
      .join("");

  const paymentsBody =
    '<div class="aqua-payments-portal">' +
    bankCardHtml +
    '<div class="aqua-pay-form-card">' +
    '<div class="aqua-pay-form-head">' +
    '<h4><span class="material-symbols-outlined">payments</span> Submit Payment Confirmation</h4>' +
    "<small>After completing your bank transfer, enter your receipt details below so our desk can verify and dispatch your parts.</small>" +
    "</div>" +
    '<form id="aqua-payment-form" class="aqua-portal-form">' +
    (state.orders.length > 0
      ? '<div class="aqua-field">' +
        '<label for="aqua-pay-order-select">Link to Your Tracked Order (optional)</label>' +
        '<select id="aqua-pay-order-select">' + orderPickerOptions + "</select>" +
        "</div>"
      : "") +
    '<div class="aqua-field-row">' +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-order-num">Order # (optional)</label>' +
    '<input id="aqua-pay-order-num" type="text" maxlength="32" placeholder="e.g. AQ-261125-4K9M" value="' + esc(prefillOrder) + '" />' +
    "</div>" +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-amount">Amount Paid (LKR)</label>' +
    '<input id="aqua-pay-amount" type="number" min="1" max="' + LIMITS.quoteTotalMax + '" step="1" placeholder="e.g. 85000" value="' + esc(prefillAmount) + '" required />' +
    "</div>" +
    "</div>" +
    '<div class="aqua-field-row">' +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-method">Payment Method</label>' +
    '<select id="aqua-pay-method" required>' +
    '<option value="bank_transfer">Direct Bank Transfer</option>' +
    '<option value="online_transfer">Online Banking Transfer</option>' +
    '<option value="ceft_instant">CEFT / Instant Fund Transfer</option>' +
    '<option value="cash_deposit">CDM / Branch Cash Deposit</option>' +
    "</select>" +
    "</div>" +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-date">Transfer Date</label>' +
    '<input id="aqua-pay-date" type="date" value="' + esc(getTodayIsoDate()) + '" required />' +
    "</div>" +
    "</div>" +
    '<div class="aqua-field-row">' +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-ref">Bank Reference / Slip #</label>' +
    '<input id="aqua-pay-ref" type="text" maxlength="' + LIMITS.bankRefMax + '" placeholder="e.g. CEFT-9482716 or Slip #" required />' +
    "</div>" +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-depositor">Depositor / Account Holder Name</label>' +
    '<input id="aqua-pay-depositor" type="text" maxlength="' + LIMITS.depositorNameMax + '" value="' + esc(fullName) + '" required />' +
    "</div>" +
    "</div>" +
    '<div class="aqua-field">' +
    '<label for="aqua-pay-note">Note for Billing Desk (optional)</label>' +
    '<input id="aqua-pay-note" type="text" maxlength="' + LIMITS.paymentNoteMax + '" placeholder="e.g. Paid via Commercial Bank online, please dispatch today" />' +
    "</div>" +
    '<button type="submit" class="aqua-primary-btn"' + (state.busy ? " disabled" : "") + ">" +
    '<span class="material-symbols-outlined">send</span>' +
    "<span>" + (state.busy ? "Submitting Payment..." : "Submit Payment Confirmation") + "</span>" +
    "</button>" +
    "</form>" +
    "</div>" +
    '<div class="aqua-pay-history">' +
    '<h4 class="aqua-pay-history-title">My Payment Submissions (' + state.payments.length + ")</h4>" +
    (state.payments.length === 0
      ? '<div class="aqua-empty-quotes"><span class="material-symbols-outlined">receipt</span><p>No payment confirmations submitted yet. Your bank transfers and verification status will appear here.</p></div>'
      : '<div class="aqua-orders-list">' +
        state.payments
          .map((p) => {
            const stKey = p.status || "pending_verification";
            const stLabel = PAYMENT_STATUS_LABELS[stKey] || stKey;
            return (
              '<div class="aqua-payment-card is-' + esc(stKey) + '">' +
              '<div class="aqua-order-card-top">' +
              "<div>" +
              '<div class="aqua-pay-card-title">' +
              '<strong class="aqua-order-num">' + esc(p.paymentRef || p.paymentId) + "</strong>" +
              '<span class="aqua-pay-status is-' + esc(stKey) + '">' + esc(stLabel) + "</span>" +
              "</div>" +
              "<small>" +
              "<b>" + esc(fmtLKR(Number(p.amountLkr) || 0)) + "</b>" +
              " · " + esc(PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod) +
              (p.orderNumber ? " · Order " + esc(p.orderNumber) : "") +
              "</small>" +
              "</div>" +
              '<div class="aqua-quote-item-btns">' +
              '<a class="aqua-mini-btn is-wa" href="' + esc(buildPaymentWhatsAppHref(p)) + '" target="_blank" rel="noopener noreferrer" title="Send slip via WhatsApp"><span class="material-symbols-outlined">chat</span><span>Slip</span></a>' +
              (stKey === "pending_verification"
                ? '<button type="button" class="aqua-mini-btn is-del" data-cancel-payment="' + esc(p.id) + '" title="Cancel pending payment"><span class="material-symbols-outlined">cancel</span></button>'
                : "") +
              "</div></div>" +
              '<div class="aqua-pay-meta-grid">' +
              "<span><b>Ref #:</b> " + esc(p.bankReference || "-") + "</span>" +
              "<span><b>Depositor:</b> " + esc(p.depositorName || "-") + "</span>" +
              "<span><b>Date:</b> " + esc(p.transferDate || fmtDate(p.createdAt)) + "</span>" +
              "</div>" +
              (p.note ? '<p class="aqua-pay-buyer-note">Note: ' + esc(p.note) + "</p>" : "") +
              (p.adminNote
                ? '<div class="aqua-order-tech-note"><span class="material-symbols-outlined">verified_user</span><span>Billing Desk: ' + esc(p.adminNote) + "</span></div>"
                : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>") +
    "</div>" +
    "</div>";

  const overridesList = Array.from(state.inventoryOverrides.values());
  const adminBody = !admin
    ? ""
    : '<div class="aqua-admin-desk">' +
      '<div class="aqua-admin-section" id="aqua-admin-bank-section">' +
      '<h4><span class="material-symbols-outlined">account_balance</span> Official Bank Transfer Details (Visible After Login Only)</h4>' +
      '<form id="aqua-admin-bank-form" class="aqua-admin-bank-form">' +
      '<div class="aqua-field-row">' +
      '<div class="aqua-field"><label for="adm-bank-name">Bank Name</label><input id="adm-bank-name" type="text" maxlength="' + LIMITS.bankNameMax + '" placeholder="e.g. Commercial Bank of Ceylon" value="' + esc((bd && bd.bankName) || "") + '" required /></div>' +
      '<div class="aqua-field"><label for="adm-bank-branch">Branch</label><input id="adm-bank-branch" type="text" maxlength="' + LIMITS.branchMax + '" placeholder="e.g. Embilipitiya Branch" value="' + esc((bd && bd.branch) || "") + '" required /></div>' +
      "</div>" +
      '<div class="aqua-field-row">' +
      '<div class="aqua-field"><label for="adm-bank-holder">Account Holder Name</label><input id="adm-bank-holder" type="text" maxlength="' + LIMITS.accountNameMax + '" placeholder="e.g. Aqua PC Solutions" value="' + esc((bd && bd.accountName) || "") + '" required /></div>' +
      '<div class="aqua-field"><label for="adm-bank-num">Account Number</label><input id="adm-bank-num" type="text" maxlength="' + LIMITS.accountNumberMax + '" placeholder="Enter bank account number" value="' + esc((bd && bd.accountNumber) || "") + '" required /></div>' +
      "</div>" +
      '<div class="aqua-field-row">' +
      '<div class="aqua-field"><label for="adm-bank-swift">Bank / SWIFT Code (optional)</label><input id="adm-bank-swift" type="text" maxlength="' + LIMITS.swiftCodeMax + '" placeholder="e.g. CCEYLKLX" value="' + esc((bd && bd.swiftCode) || "") + '" /></div>' +
      '<div class="aqua-field"><label for="adm-bank-instr">Transfer Instructions (optional)</label><input id="adm-bank-instr" type="text" maxlength="' + LIMITS.instructionsMax + '" placeholder="e.g. Put your Order # in transfer remarks" value="' + esc((bd && bd.instructions) || "") + '" /></div>' +
      "</div>" +
      '<button type="submit" class="aqua-primary-btn"' + (state.busy ? " disabled" : "") + '><span class="material-symbols-outlined">save</span><span>Save Official Bank Details</span></button>' +
      "</form>" +
      "</div>" +
      '<div class="aqua-admin-section">' +
      '<h4><span class="material-symbols-outlined">payments</span> Buyer Payments Verification Queue (' + state.adminPayments.length + ")</h4>" +
      (state.adminPayments.length === 0
        ? '<small class="aqua-order-hint">No buyer payment confirmations submitted yet.</small>'
        : '<div class="aqua-orders-list">' +
          state.adminPayments
            .map(
              (p) =>
                '<div class="aqua-order-card is-admin-row">' +
                '<div class="aqua-order-card-top">' +
                '<div><strong class="aqua-order-num">' + esc(p.paymentRef || p.paymentId) + " · " + esc(p.customerName) + "</strong>" +
                "<small>" + esc(p.customerEmail) + (p.orderNumber ? " · Order " + esc(p.orderNumber) : "") + " · <b>" + esc(fmtLKR(Number(p.amountLkr) || 0)) + "</b></small></div>" +
                '<span class="aqua-pay-status is-' + esc(p.status || "pending_verification") + '">' + esc(PAYMENT_STATUS_LABELS[p.status] || p.status) + "</span>" +
                "</div>" +
                '<div class="aqua-pay-meta-grid">' +
                "<span><b>Method:</b> " + esc(PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod) + "</span>" +
                "<span><b>Ref #:</b> " + esc(p.bankReference || "-") + "</span>" +
                "<span><b>Depositor:</b> " + esc(p.depositorName || "-") + " (" + esc(p.transferDate || "-") + ")</span>" +
                "</div>" +
                (p.note ? '<p class="aqua-pay-buyer-note">Buyer Note: ' + esc(p.note) + "</p>" : "") +
                '<div class="aqua-admin-order-controls">' +
                '<select data-admin-pay-status="' + esc(p.id) + '">' +
                LIMITS.validPaymentStatuses
                  .map(
                    (st) =>
                      '<option value="' + st + '"' + (p.status === st ? " selected" : "") + ">" + esc(PAYMENT_STATUS_LABELS[st] || st) + "</option>"
                  )
                  .join("") +
                "</select>" +
                '<input type="text" maxlength="' + LIMITS.paymentNoteMax + '" data-admin-pay-note="' + esc(p.id) + '" value="' + esc(p.adminNote || "") + '" placeholder="Verification / billing note..." />' +
                '<button type="button" class="aqua-mini-btn is-order" data-admin-save-payment="' + esc(p.id) + '">Update</button>' +
                "</div>" +
                "</div>"
            )
            .join("") +
          "</div>") +
      "</div>" +
      '<div class="aqua-admin-section">' +
      '<h4><span class="material-symbols-outlined">inventory</span> Live Firestore Stock &amp; Price Override</h4>' +
      '<form id="aqua-admin-stock-form" class="aqua-admin-stock-form">' +
      '<input id="adm-sku" type="text" placeholder="SKU (e.g. AQ-VGA-0001)" required />' +
      '<input id="adm-qty" type="number" min="0" max="9999" value="2" placeholder="Stock Qty" required />' +
      '<input id="adm-price" type="number" min="0" max="100000000" placeholder="LKR Price (optional)" />' +
      '<input id="adm-note" type="text" maxlength="120" placeholder="Workshop note (e.g. Last unit)" />' +
      '<button type="submit" class="aqua-primary-btn"' + (state.busy ? " disabled" : "") + '><span class="material-symbols-outlined">bolt</span><span>Sync Live</span></button>' +
      "</form>" +
      (overridesList.length > 0
        ? '<div class="aqua-override-chips">' +
          overridesList
            .slice(0, 12)
            .map(
              (ov) =>
                '<span class="aqua-ov-chip"><b>' +
                esc(ov.sku) +
                "</b> · Qty: " +
                esc(String(ov.stockQty)) +
                (typeof ov.price === "number" ? " · " + esc(fmtLKR(ov.price)) : "") +
                '<button type="button" data-del-ov="' + esc(ov.sku) + '" aria-label="Remove override">×</button></span>'
            )
            .join("") +
          "</div>"
        : '<small class="aqua-order-hint">No live stock overrides yet. Enter any SKU above to show real-time low-stock badges across all visitors.</small>') +
      "</div>" +
      '<div class="aqua-admin-section">' +
      '<h4><span class="material-symbols-outlined">local_shipping</span> Customer Orders Queue (' + state.adminOrders.length + ")</h4>" +
      (state.adminOrders.length === 0
        ? '<small class="aqua-order-hint">No customer orders submitted yet.</small>'
        : '<div class="aqua-orders-list">' +
          state.adminOrders
            .map(
              (o) =>
                '<div class="aqua-order-card is-admin-row">' +
                '<div class="aqua-order-card-top">' +
                '<div><strong class="aqua-order-num">' + esc(o.orderNumber || o.orderId) + " · " + esc(o.customerName) + "</strong>" +
                "<small>" + esc(o.customerEmail) + (o.customerPhone ? " · " + esc(o.customerPhone) : "") + " · <b>" + esc(fmtLKR(Number(o.totalLkr) || 0)) + "</b></small></div>" +
                '<button type="button" class="aqua-mini-btn is-inv" data-print-admin-order="' + esc(o.id) + '"><span class="material-symbols-outlined">receipt_long</span><span>Invoice</span></button>' +
                "</div>" +
                '<div class="aqua-admin-order-controls">' +
                '<select data-admin-status="' + esc(o.id) + '">' +
                LIMITS.validStatuses
                  .map(
                    (st) =>
                      '<option value="' + st + '"' + (o.status === st ? " selected" : "") + ">" + esc(STATUS_LABELS[st] || st) + "</option>"
                  )
                  .join("") +
                "</select>" +
                '<input type="text" maxlength="240" data-admin-note="' + esc(o.id) + '" value="' + esc(o.statusNote || "") + '" placeholder="Bench-test / courier note..." />' +
                '<button type="button" class="aqua-mini-btn is-order" data-admin-save-order="' + esc(o.id) + '">Update</button>' +
                "</div>" +
                "</div>"
            )
            .join("") +
          "</div>") +
      "</div></div>";

  const activeBody =
    tab === "profile"
      ? profileBody
      : tab === "payments"
        ? paymentsBody
        : tab === "quotes"
          ? quotesBody
          : tab === "admin"
            ? adminBody
            : ordersBody;

  const verifyBannerHtml =
    !state.user.emailVerified && detectUserProvider(state.user) === "password"
      ? '<div class="aqua-verify-banner" role="status">' +
        '<span class="material-symbols-outlined">mark_email_unread</span>' +
        '<div><strong>Verify your email address</strong><small>Check your inbox to verify ' + esc(email) + ".</small></div>" +
        '<div class="aqua-verify-actions">' +
        '<button type="button" class="aqua-mini-btn" id="aqua-resend-verify"' + (state.busy ? " disabled" : "") + ">Resend</button>" +
        '<button type="button" class="aqua-mini-btn is-inv" id="aqua-refresh-verify"' + (state.busy ? " disabled" : "") + ">Refresh</button>" +
        "</div>" +
        "</div>"
      : "";

  host.innerHTML =
    '<div class="aqua-auth-card is-portal">' +
    '<button type="button" class="aqua-auth-close" id="aqua-modal-close" aria-label="Close customer portal">' +
    '<span class="material-symbols-outlined">close</span>' +
    "</button>" +
    '<div class="aqua-portal-header">' +
    (photo
      ? '<img class="aqua-portal-avatar" src="' + esc(photo) + '" alt="" referrerpolicy="no-referrer" />'
      : '<span class="aqua-portal-avatar is-initials">' + esc(initials) + "</span>") +
    '<div class="aqua-portal-id">' +
    '<span class="aqua-verified-tag">' + getProviderBadgeLabel(state.user, true) + "</span>" +
    '<h2 id="aqua-auth-modal-title">' + esc(fullName) + "</h2>" +
    "<p>" + esc(email) + "</p>" +
    "</div>" +
    "</div>" +
    verifyBannerHtml +
    '<div class="aqua-mode-tabs is-portal-tabs' + (admin ? " has-5" : " has-4") + '" role="tablist">' +
    '<button type="button" role="tab" aria-selected="' + (tab === "orders" ? "true" : "false") + '" class="aqua-mode-tab' + (tab === "orders" ? " active" : "") + '" data-portal-tab="orders">' +
    '<span class="material-symbols-outlined">local_shipping</span><span>Orders (' + state.orders.length + ")</span></button>" +
    '<button type="button" role="tab" aria-selected="' + (tab === "payments" ? "true" : "false") + '" class="aqua-mode-tab' + (tab === "payments" ? " active" : "") + '" data-portal-tab="payments">' +
    '<span class="material-symbols-outlined">account_balance</span><span>Payments (' + state.payments.length + ")</span></button>" +
    '<button type="button" role="tab" aria-selected="' + (tab === "quotes" ? "true" : "false") + '" class="aqua-mode-tab' + (tab === "quotes" ? " active" : "") + '" data-portal-tab="quotes">' +
    '<span class="material-symbols-outlined">bookmark</span><span>Quotes (' + state.quotes.length + ")</span></button>" +
    '<button type="button" role="tab" aria-selected="' + (tab === "profile" ? "true" : "false") + '" class="aqua-mode-tab' + (tab === "profile" ? " active" : "") + '" data-portal-tab="profile">' +
    '<span class="material-symbols-outlined">badge</span><span>Profile</span></button>' +
    (admin
      ? '<button type="button" role="tab" aria-selected="' + (tab === "admin" ? "true" : "false") + '" class="aqua-mode-tab' + (tab === "admin" ? " active" : "") + '" data-portal-tab="admin">' +
        '<span class="material-symbols-outlined">admin_panel_settings</span><span>Admin</span></button>'
      : "") +
    "</div>" +
    feedbackHtml +
    activeBody +
    '<div class="aqua-auth-foot">' +
    '<a href="' + MAIN_SITE_ACCOUNT_URL + '" target="_blank" rel="noopener noreferrer">Aqua PC Solutions Account ↗</a>' +
    '<button type="button" class="aqua-signout-link" id="aqua-portal-signout">Sign Out</button>' +
    "</div>" +
    "</div>";

  const closeBtn = host.querySelector("#aqua-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  const signOutBtn = host.querySelector("#aqua-portal-signout");
  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);

  const resendVerifyBtn = host.querySelector("#aqua-resend-verify");
  if (resendVerifyBtn) resendVerifyBtn.addEventListener("click", resendVerificationEmail);

  const refreshVerifyBtn = host.querySelector("#aqua-refresh-verify");
  if (refreshVerifyBtn) refreshVerifyBtn.addEventListener("click", refreshEmailVerificationStatus);

  host.querySelectorAll("[data-portal-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.portalTab = btn.getAttribute("data-portal-tab") || "orders";
      state.errorMsg = "";
      state.successMsg = "";
      renderModalContent();
    });
  });

  const profileForm = host.querySelector("#aqua-profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveProfileChanges(
        (host.querySelector("#aqua-prof-name") || {}).value,
        (host.querySelector("#aqua-prof-phone") || {}).value,
        (host.querySelector("#aqua-prof-city") || {}).value
      );
    });
  }

  const saveCartBtn = host.querySelector("#aqua-save-cart-btn");
  if (saveCartBtn) {
    saveCartBtn.addEventListener("click", () => {
      saveCurrentCartToCloud((host.querySelector("#aqua-quote-title-input") || {}).value);
    });
  }

  host.querySelectorAll("[data-del-quote]").forEach((btn) => {
    btn.addEventListener("click", () => deleteSavedQuote(btn.getAttribute("data-del-quote")));
  });

  host.querySelectorAll("[data-quote-to-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-quote-to-order");
      const found = state.quotes.find((x) => x.id === qid);
      if (found) createTrackedOrder(found);
    });
  });

  const fulfillSel = host.querySelector("#aqua-order-fulfill");
  if (fulfillSel) {
    fulfillSel.addEventListener("change", () => {
      state.orderFulfillment = fulfillSel.value || "pickup";
    });
  }

  const placeOrderBtn = host.querySelector("#aqua-place-order-btn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", () => createTrackedOrder(null));
  }

  host.querySelectorAll("[data-pay-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oid = btn.getAttribute("data-pay-order");
      const found = state.orders.find((x) => x.id === oid);
      if (found) {
        openPaymentPortal(found.orderNumber || "", Number(found.totalLkr) || 0);
      }
    });
  });

  host.querySelectorAll("[data-print-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oid = btn.getAttribute("data-print-order");
      const found = state.orders.find((x) => x.id === oid);
      if (found) openInvoiceModal(found);
    });
  });

  host.querySelectorAll("[data-print-admin-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oid = btn.getAttribute("data-print-admin-order");
      const found = state.adminOrders.find((x) => x.id === oid);
      if (found) openInvoiceModal(found);
    });
  });

  host.querySelectorAll("[data-cancel-order]").forEach((btn) => {
    btn.addEventListener("click", () => cancelMyOrder(btn.getAttribute("data-cancel-order")));
  });

  // Payment Portal bindings
  host.querySelectorAll("[data-copy-bank]").forEach((btn) => {
    btn.addEventListener("click", () => {
      copyTextWithToast(btn.getAttribute("data-copy-bank"), btn.getAttribute("data-copy-label"));
    });
  });

  const copyAllBankBtn = host.querySelector("#aqua-copy-all-bank");
  if (copyAllBankBtn && state.bankDetails) {
    copyAllBankBtn.addEventListener("click", () => {
      const d = state.bankDetails;
      const lines = [
        "Bank: " + d.bankName,
        "Account Name: " + d.accountName,
        "Account Number: " + d.accountNumber,
        "Branch: " + d.branch,
        d.swiftCode ? "SWIFT / Bank Code: " + d.swiftCode : "",
      ].filter(Boolean);
      copyTextWithToast(lines.join("\n"), "Bank Details");
    });
  }

  const gotoAdminBankBtn = host.querySelector("#aqua-goto-admin-bank");
  if (gotoAdminBankBtn) {
    gotoAdminBankBtn.addEventListener("click", () => {
      state.portalTab = "admin";
      state.errorMsg = "";
      state.successMsg = "";
      renderModalContent();
    });
  }

  const payOrderSelect = host.querySelector("#aqua-pay-order-select");
  if (payOrderSelect) {
    payOrderSelect.addEventListener("change", () => {
      const selectedOpt = payOrderSelect.options[payOrderSelect.selectedIndex];
      const ordInput = host.querySelector("#aqua-pay-order-num");
      const amtInput = host.querySelector("#aqua-pay-amount");
      if (ordInput) ordInput.value = payOrderSelect.value || "";
      if (amtInput && selectedOpt) {
        const amt = selectedOpt.getAttribute("data-amt");
        if (amt && Number(amt) > 0) amtInput.value = amt;
      }
    });
  }

  const paymentForm = host.querySelector("#aqua-payment-form");
  if (paymentForm) {
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitBuyerPayment({
        orderNumber: (host.querySelector("#aqua-pay-order-num") || {}).value,
        amountLkr: (host.querySelector("#aqua-pay-amount") || {}).value,
        paymentMethod: (host.querySelector("#aqua-pay-method") || {}).value,
        transferDate: (host.querySelector("#aqua-pay-date") || {}).value,
        bankReference: (host.querySelector("#aqua-pay-ref") || {}).value,
        depositorName: (host.querySelector("#aqua-pay-depositor") || {}).value,
        note: (host.querySelector("#aqua-pay-note") || {}).value,
      });
    });
  }

  host.querySelectorAll("[data-cancel-payment]").forEach((btn) => {
    btn.addEventListener("click", () => cancelMyPayment(btn.getAttribute("data-cancel-payment")));
  });

  // Admin Bank Details & Payment Verification bindings
  const adminBankForm = host.querySelector("#aqua-admin-bank-form");
  if (adminBankForm) {
    adminBankForm.addEventListener("submit", (e) => {
      e.preventDefault();
      adminSaveBankDetails({
        bankName: (host.querySelector("#adm-bank-name") || {}).value,
        branch: (host.querySelector("#adm-bank-branch") || {}).value,
        accountName: (host.querySelector("#adm-bank-holder") || {}).value,
        accountNumber: (host.querySelector("#adm-bank-num") || {}).value,
        swiftCode: (host.querySelector("#adm-bank-swift") || {}).value,
        instructions: (host.querySelector("#adm-bank-instr") || {}).value,
      });
    });
  }

  host.querySelectorAll("[data-admin-save-payment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-admin-save-payment");
      const sel = host.querySelector('[data-admin-pay-status="' + pid + '"]');
      const noteInp = host.querySelector('[data-admin-pay-note="' + pid + '"]');
      adminUpdatePaymentStatus(
        pid,
        sel ? sel.value : "pending_verification",
        noteInp ? noteInp.value : ""
      );
    });
  });

  const stockForm = host.querySelector("#aqua-admin-stock-form");
  if (stockForm) {
    stockForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sku = (host.querySelector("#adm-sku") || {}).value;
      const qty = (host.querySelector("#adm-qty") || {}).value;
      const price = (host.querySelector("#adm-price") || {}).value;
      const note = (host.querySelector("#adm-note") || {}).value;
      state.busy = true;
      state.errorMsg = "";
      state.successMsg = "";
      renderModalContent();
      try {
        await saveInventoryOverride(sku, {
          stockQty: Number(qty),
          inStock: Number(qty) > 0,
          lowStockThreshold: 3,
          price: price !== "" ? Number(price) : undefined,
          note,
        });
        state.busy = false;
        state.successMsg = "Live Firestore stock synced for " + String(sku).toUpperCase() + "!";
        renderModalContent();
        showPageToast("Stock synced live");
      } catch (err) {
        state.busy = false;
        state.errorMsg = err && err.message ? err.message : "Failed to save stock override.";
        renderModalContent();
      }
    });
  }

  host.querySelectorAll("[data-del-ov]").forEach((btn) => {
    btn.addEventListener("click", () => deleteInventoryOverride(btn.getAttribute("data-del-ov")));
  });

  host.querySelectorAll("[data-admin-save-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oid = btn.getAttribute("data-admin-save-order");
      const sel = host.querySelector('[data-admin-status="' + oid + '"]');
      const noteInp = host.querySelector('[data-admin-note="' + oid + '"]');
      adminUpdateOrderStatus(oid, sel ? sel.value : "received", noteInp ? noteInp.value : "");
    });
  });
}

// ───────── Public 'Track Order' Modal (Zero-PII Live Lookup) ─────────
function detachTrackListener() {
  if (typeof state.trackUnsub === "function") {
    state.trackUnsub();
    state.trackUnsub = null;
  }
}

function ensureTrackModalHost() {
  let host = document.getElementById("aqua-track-modal");
  if (host) return host;

  host = document.createElement("div");
  host.id = "aqua-track-modal";
  host.className = "aqua-auth-overlay aqua-track-overlay";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-labelledby", "aqua-track-title");
  host.hidden = true;

  host.addEventListener("click", (e) => {
    if (e.target === host) closeTrackOrderModal();
  });

  document.body.appendChild(host);
  return host;
}

function syncTrackModalVisibility() {
  const host = ensureTrackModalHost();
  host.hidden = !state.trackOpen;
  host.classList.toggle("open", state.trackOpen);
  document.body.classList.toggle("aqua-modal-open", state.modalOpen || state.trackOpen);
}

function openTrackOrderModal(prefillCode) {
  state.menuOpen = false;
  state.trackOpen = true;
  state.trackError = "";
  renderHeaderSlot();
  if (typeof prefillCode === "string" && prefillCode.trim()) {
    const cleaned = prefillCode.trim().toUpperCase();
    state.trackQuery = cleaned;
    renderTrackModal();
    syncTrackModalVisibility();
    lookupOrderTracking(cleaned);
    return;
  }
  renderTrackModal();
  syncTrackModalVisibility();
  setTimeout(() => {
    const inp = document.getElementById("aqua-track-input");
    if (inp) inp.focus();
  }, 60);
}

function closeTrackOrderModal() {
  detachTrackListener();
  state.trackOpen = false;
  state.trackLoading = false;
  syncTrackModalVisibility();
}

function normalizeTrackingStageLabel(stageKey, fulfillment) {
  if (stageKey === "dispatched" && fulfillment === "pickup") {
    return "Ready for Pickup";
  }
  return STATUS_LABELS[stageKey] || "Order Received";
}

function getTrackingStageDescription(stageKey, fulfillment) {
  if (stageKey === "cancelled") {
    return "This order was cancelled prior to dispatch. Contact our workshop desk on WhatsApp if you need to reorder.";
  }
  if (stageKey === "dispatched" && fulfillment === "pickup") {
    return "Your hardware is packed, warranty-sealed, and ready for collection at our Embilipitiya showroom.";
  }
  const found = ORDER_STAGES.find((s) => s.key === stageKey);
  return found ? found.desc : "Checking workshop fulfillment status.";
}

function findLocalOwnedOrderByNumber(code) {
  const target = String(code || "").toUpperCase();
  return (
    state.orders.find((o) => String(o.orderNumber || "").toUpperCase() === target) ||
    state.adminOrders.find((o) => String(o.orderNumber || "").toUpperCase() === target) ||
    null
  );
}

function lookupOrderTracking(rawCode) {
  const code = String(rawCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  state.trackQuery = code;
  state.trackError = "";
  state.trackNotFound = false;

  if (!code) {
    state.trackError = "Enter your order number to check live workshop status (e.g. AQ-261125-4K9M).";
    state.trackResult = null;
    renderTrackModal();
    return;
  }
  if (!LIMITS.orderNumberPattern.test(code)) {
    state.trackError =
      "Order numbers use letters, numbers, and hyphens only (e.g. AQ-261125-4K9M).";
    state.trackResult = null;
    renderTrackModal();
    return;
  }

  detachTrackListener();
  state.trackLoading = true;
  state.trackResult = null;
  renderTrackModal();

  const path = "orderTracking/" + code;
  ensureFirebase()
    .then(() => {
      detachTrackListener();
      state.trackUnsub = onSnapshot(
        doc(db, "orderTracking", code),
        (snap) => {
          state.trackLoading = false;
          if (snap.exists()) {
            state.trackResult = { id: snap.id, ...snap.data() };
            state.trackNotFound = false;
            state.trackError = "";
          } else {
            // Fallback for older orders owned by the currently signed-in customer
            const owned = findLocalOwnedOrderByNumber(code);
            if (owned) {
              state.trackResult = {
                orderNumber: owned.orderNumber,
                orderId: owned.orderId || owned.id,
                ownerId: owned.ownerId,
                fulfillment: owned.fulfillment || "pickup",
                deliveryRegion: owned.deliveryCity || "",
                itemCount: owned.itemCount || 1,
                status: owned.status || "received",
                statusNote: owned.statusNote || "",
                createdAt: owned.createdAt,
                updatedAt: owned.updatedAt,
              };
              state.trackNotFound = false;
              state.trackError = "";
            } else {
              state.trackResult = null;
              state.trackNotFound = true;
            }
          }
          renderTrackModal();
        },
        (error) => {
          state.trackLoading = false;
          try {
            handleFirestoreError(error, OperationType.GET, path);
          } catch (_) {
            state.trackError = "Unable to connect to live order tracking right now. Please try again.";
            state.trackResult = null;
            renderTrackModal();
          }
        }
      );
    })
    .catch(() => {
      state.trackLoading = false;
      state.trackError = "Unable to initialize live order tracking right now. Please try again.";
      state.trackResult = null;
      renderTrackModal();
    });
}

function buildTrackWhatsAppHref(orderNumber, statusLabel) {
  const lines = [
    "Hello Aqua PC Parts!",
    "I would like an update on Order #: " + orderNumber,
    statusLabel ? "Current Status Shown: " + statusLabel : "",
  ].filter(Boolean);
  return "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(lines.join("\n"));
}

function renderTrackTimeline(status, fulfillment) {
  if (status === "cancelled") {
    return (
      '<div class="aqua-track-cancelled-box">' +
      '<span class="material-symbols-outlined">cancel</span>' +
      "<div>" +
      "<strong>Order Cancelled</strong>" +
      "<p>This order was cancelled prior to courier handover.</p>" +
      "</div>" +
      "</div>"
    );
  }

  const activeIdx = Math.max(
    0,
    ORDER_STAGES.findIndex((s) => s.key === status)
  );

  return (
    '<ol class="aqua-track-timeline" aria-label="Order fulfillment milestones">' +
    ORDER_STAGES.map((stage, idx) => {
      const isDone = idx < activeIdx;
      const isCurrent = idx === activeIdx;
      const stageLabel = normalizeTrackingStageLabel(stage.key, fulfillment);
      const stageDesc =
        stage.key === "dispatched" && fulfillment === "pickup"
          ? "Sealed and waiting for collection at our Embilipitiya showroom."
          : stage.desc;
      const stateText = isDone ? "Completed" : isCurrent ? "Current Stage" : "Upcoming";
      const cls = isDone ? "is-done" : isCurrent ? "is-current" : "is-upcoming";

      return (
        '<li class="aqua-track-step ' +
        cls +
        '">' +
        '<div class="aqua-track-marker" aria-hidden="true">' +
        '<span class="material-symbols-outlined">' +
        (isDone ? "check" : stage.icon) +
        "</span>" +
        "</div>" +
        '<div class="aqua-track-step-body">' +
        '<div class="aqua-track-step-head">' +
        "<strong>" + esc(stageLabel) + "</strong>" +
        '<span class="aqua-track-step-state">' + stateText + "</span>" +
        "</div>" +
        "<p>" + esc(stageDesc) + "</p>" +
        "</div>" +
        "</li>"
      );
    }).join("") +
    "</ol>"
  );
}

function renderTrackModal() {
  const host = ensureTrackModalHost();

  const recentOrdersHtml =
    state.user && state.orders.length > 0
      ? '<div class="aqua-track-recent">' +
        '<span class="aqua-track-recent-label">Your recent orders</span>' +
        '<div class="aqua-track-recent-list">' +
        state.orders
          .slice(0, 4)
          .map((o) => {
            const num = o.orderNumber || o.orderId;
            const active = state.trackQuery === String(num).toUpperCase();
            return (
              '<button type="button" class="aqua-track-recent-btn' +
              (active ? " is-active" : "") +
              '" data-track-pick="' +
              esc(num) +
              '">' +
              '<span class="aqua-track-mono">' + esc(num) + "</span>" +
              '<span class="aqua-track-recent-stage">' +
              esc(normalizeTrackingStageLabel(o.status || "received", o.fulfillment)) +
              "</span>" +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        "</div>"
      : "";

  let bodyHtml = "";

  if (state.trackLoading) {
    bodyHtml =
      '<div class="aqua-track-state-box" role="status">' +
      '<span class="material-symbols-outlined aqua-spin">progress_activity</span>' +
      "<strong>Looking up order " + esc(state.trackQuery) + "...</strong>" +
      "<p>Checking live Embilipitiya workshop and courier records.</p>" +
      "</div>";
  } else if (state.trackError) {
    bodyHtml =
      '<div class="aqua-alert is-error" role="alert">' +
      '<span class="material-symbols-outlined">error</span>' +
      "<span>" + esc(state.trackError) + "</span>" +
      "</div>";
  } else if (state.trackNotFound) {
    bodyHtml =
      '<div class="aqua-track-state-box is-not-found" role="status">' +
      '<span class="material-symbols-outlined">search_off</span>' +
      "<strong>No order found for " + esc(state.trackQuery) + "</strong>" +
      "<p>Double-check the order number on your Aqua invoice or WhatsApp confirmation (format: <span class=\"aqua-track-mono\">AQ-261125-4K9M</span>).</p>" +
      '<div class="aqua-track-state-actions">' +
      '<a class="aqua-mini-btn is-wa" href="' +
      esc(buildTrackWhatsAppHref(state.trackQuery, "")) +
      '" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">chat</span><span>Verify on WhatsApp</span></a>' +
      (!state.user
        ? '<button type="button" class="aqua-mini-btn is-inv" id="aqua-track-signin-hint"><span class="material-symbols-outlined">login</span><span>Sign In to View Orders</span></button>'
        : "") +
      "</div>" +
      "</div>";
  } else if (state.trackResult) {
    const r = state.trackResult;
    const stageLabel = normalizeTrackingStageLabel(r.status || "received", r.fulfillment);
    const stageDesc = getTrackingStageDescription(r.status || "received", r.fulfillment);
    const ownedOrder = findLocalOwnedOrderByNumber(r.orderNumber);
    const fulfillLabel = FULFILL_LABELS[r.fulfillment] || "Workshop Fulfillment";
    const metaParts = [
      fulfillLabel,
      r.deliveryRegion ? r.deliveryRegion : null,
      (r.itemCount || 1) + (Number(r.itemCount) === 1 ? " hardware item" : " hardware items"),
      "Updated " + fmtDate(r.updatedAt || r.createdAt),
    ].filter(Boolean);

    bodyHtml =
      '<div class="aqua-track-result">' +
      '<div class="aqua-track-summary">' +
      '<div class="aqua-track-summary-top">' +
      "<div>" +
      '<div class="aqua-track-order-row">' +
      '<span class="aqua-track-order-code">' + esc(r.orderNumber) + "</span>" +
      '<button type="button" class="aqua-track-copy-btn" id="aqua-track-copy-num" title="Copy order number" aria-label="Copy order number">' +
      '<span class="material-symbols-outlined">content_copy</span>' +
      "</button>" +
      "</div>" +
      '<h3 class="aqua-track-status-heading">' + esc(stageLabel) + "</h3>" +
      "</div>" +
      '<span class="aqua-track-live-label">Live sync</span>' +
      "</div>" +
      '<p class="aqua-track-status-desc">' + esc(stageDesc) + "</p>" +
      '<div class="aqua-track-meta-line">' +
      metaParts.map((m) => "<span>" + esc(m) + "</span>").join('<span aria-hidden="true">·</span>') +
      "</div>" +
      "</div>" +
      (r.statusNote
        ? '<div class="aqua-track-note">' +
          '<span class="material-symbols-outlined">biotech</span>' +
          "<div><strong>Workshop Note</strong><p>" + esc(r.statusNote) + "</p></div>" +
          "</div>"
        : "") +
      renderTrackTimeline(r.status || "received", r.fulfillment) +
      '<div class="aqua-track-result-actions">' +
      (ownedOrder
        ? '<button type="button" class="aqua-mini-btn is-inv" id="aqua-track-open-invoice"><span class="material-symbols-outlined">receipt_long</span><span>View Full Invoice</span></button>'
        : "") +
      '<a class="aqua-mini-btn is-wa" href="' +
      esc(buildTrackWhatsAppHref(r.orderNumber, stageLabel)) +
      '" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">chat</span><span>Ask Workshop on WhatsApp</span></a>' +
      '<button type="button" class="aqua-mini-btn" id="aqua-track-clear-btn"><span>Track Another</span></button>' +
      "</div>" +
      "</div>";
  } else {
    bodyHtml =
      '<div class="aqua-track-guide">' +
      "<p>Enter the Aqua order code from your checkout confirmation or printed warranty invoice to follow every workshop step in real time:</p>" +
      '<div class="aqua-track-stage-preview">' +
      "<span>Order Received</span>" +
      '<span aria-hidden="true">→</span>' +
      "<span>In Bench-Test</span>" +
      '<span aria-hidden="true">→</span>' +
      "<span>Packed</span>" +
      '<span aria-hidden="true">→</span>' +
      "<span>With Courier</span>" +
      '<span aria-hidden="true">→</span>' +
      "<span>Delivered</span>" +
      "</div>" +
      "</div>";
  }

  host.innerHTML =
    '<div class="aqua-auth-card aqua-track-card">' +
    '<button type="button" class="aqua-auth-close" id="aqua-track-close" aria-label="Close Track Order modal">' +
    '<span class="material-symbols-outlined">close</span>' +
    "</button>" +
    '<div class="aqua-auth-head">' +
    '<div class="aqua-auth-brand">' +
    '<img src="assets/logo.jpg" alt="Aqua PC Parts" />' +
    "<div>" +
    '<span class="aqua-auth-eyebrow">Embilipitiya Workshop &amp; Courier Tracker</span>' +
    '<h2 id="aqua-track-title">Track Your Order</h2>' +
    "</div>" +
    "</div>" +
    '<p class="aqua-auth-sub">Enter your order number to check live bench-test, ESD packaging, and island-wide courier updates.</p>' +
    "</div>" +
    '<form class="aqua-track-form" id="aqua-track-form" novalidate>' +
    '<label class="aqua-sr-only" for="aqua-track-input">Order Number</label>' +
    '<input type="text" id="aqua-track-input" class="aqua-track-input" maxlength="32" autocomplete="off" spellcheck="false" placeholder="e.g. AQ-261125-4K9M" value="' +
    esc(state.trackQuery) +
    '" />' +
    '<button type="submit" class="aqua-primary-btn aqua-track-submit"' +
    (state.trackLoading ? " disabled" : "") +
    ">" +
    '<span class="material-symbols-outlined">search</span>' +
    "<span>" + (state.trackLoading ? "Checking..." : "Track Status") + "</span>" +
    "</button>" +
    "</form>" +
    recentOrdersHtml +
    bodyHtml +
    '<div class="aqua-auth-foot">' +
    (state.user
      ? '<button type="button" class="aqua-text-link" id="aqua-track-open-portal">Open Full Orders &amp; Invoices Portal →</button>'
      : '<button type="button" class="aqua-text-link" id="aqua-track-open-signin">Sign in to view all your saved orders →</button>') +
    '<a href="tel:+94788194535">Hotline: +94 78 819 4535</a>' +
    "</div>" +
    "</div>";

  const closeBtn = host.querySelector("#aqua-track-close");
  if (closeBtn) closeBtn.addEventListener("click", closeTrackOrderModal);

  const form = host.querySelector("#aqua-track-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = host.querySelector("#aqua-track-input");
      lookupOrderTracking(inp ? inp.value : "");
    });
  }

  host.querySelectorAll("[data-track-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-track-pick") || "";
      lookupOrderTracking(code);
    });
  });

  const copyBtn = host.querySelector("#aqua-track-copy-num");
  if (copyBtn && state.trackResult) {
    copyBtn.addEventListener("click", () => {
      const num = state.trackResult.orderNumber;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(() => showPageToast("Copied " + num));
      } else {
        showPageToast("Order # " + num);
      }
    });
  }

  const invBtn = host.querySelector("#aqua-track-open-invoice");
  if (invBtn && state.trackResult) {
    invBtn.addEventListener("click", () => {
      const owned = findLocalOwnedOrderByNumber(state.trackResult.orderNumber);
      if (owned) openInvoiceModal(owned);
    });
  }

  const clearBtn = host.querySelector("#aqua-track-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      detachTrackListener();
      state.trackQuery = "";
      state.trackResult = null;
      state.trackNotFound = false;
      state.trackError = "";
      renderTrackModal();
      const inp = host.querySelector("#aqua-track-input");
      if (inp) inp.focus();
    });
  }

  const portalLink = host.querySelector("#aqua-track-open-portal");
  if (portalLink) {
    portalLink.addEventListener("click", () => {
      closeTrackOrderModal();
      openModal("orders");
    });
  }

  const signinLink = host.querySelector("#aqua-track-open-signin") || host.querySelector("#aqua-track-signin-hint");
  if (signinLink) {
    signinLink.addEventListener("click", () => {
      closeTrackOrderModal();
      openModal("signin");
    });
  }
}

// Global click-outside, delegated auth/track triggers, and ESC handlers
document.addEventListener("click", (e) => {
  const authTrigger = e.target && e.target.closest ? e.target.closest("[data-aqua-open-auth]") : null;
  if (authTrigger) {
    e.preventDefault();
    const reqMode = authTrigger.getAttribute("data-aqua-open-auth") || "signin";
    openModal(state.user ? "orders" : reqMode === "register" ? "register" : "signin");
    return;
  }
  const paymentTrigger = e.target && e.target.closest ? e.target.closest("[data-aqua-open-payment]") : null;
  if (paymentTrigger) {
    e.preventDefault();
    openPaymentPortal(paymentTrigger.getAttribute("data-aqua-open-payment") || "");
    return;
  }
  const trackTrigger = e.target && e.target.closest ? e.target.closest("[data-aqua-open-track]") : null;
  if (trackTrigger) {
    e.preventDefault();
    openTrackOrderModal(trackTrigger.getAttribute("data-aqua-open-track") || "");
    return;
  }
  if (state.menuOpen && !e.target.closest("#aqua-auth-slot")) {
    state.menuOpen = false;
    renderHeaderSlot();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.invoiceOrder) closeInvoiceModal();
    if (state.trackOpen) closeTrackOrderModal();
    if (state.modalOpen) closeModal();
    if (state.menuOpen) {
      state.menuOpen = false;
      renderHeaderSlot();
    }
  }
});

// Boot Firebase SDK & Auth state subscription asynchronously
ensureFirebase().catch(() => {});

// Expose global APIs for storefront & Admin Console
window.AquaAuth = {
  openLogin: (mode) => openModal(mode === "register" ? "register" : "signin"),
  openPortal: (tab) => {
    if (tab === "payments") openPaymentPortal();
    else openModal(tab || "orders");
  },
  openPayments: (orderNumber, amountLkr) => openPaymentPortal(orderNumber || "", amountLkr),
  openTrackOrder: (orderNumber) => openTrackOrderModal(orderNumber || ""),
  signOut: handleSignOut,
  getUser: () => state.user,
  isAdmin: isAdminUser,
  saveCustomQuote,
};

window.AquaInventory = {
  getOverride: (sku) => state.inventoryOverrides.get(String(sku || "").toUpperCase()) || null,
  getAllOverrides: () => Array.from(state.inventoryOverrides.values()),
  saveOverride: saveInventoryOverride,
  isAdmin: isAdminUser,
};

function initAquaAuthUI() {
  renderHeaderSlot();
  applyInventoryOverridesToCatalog();
  try {
    const params = new URLSearchParams(window.location.search);
    const trackCode = params.get("track");
    if (trackCode && trackCode.trim()) {
      openTrackOrderModal(trackCode.trim());
    }
  } catch (_) {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAquaAuthUI);
} else {
  initAquaAuthUI();
}
