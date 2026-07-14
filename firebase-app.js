/* ============================================================
   CarCare+ — Firebase app layer
   Auth (email/password) + Firestore database for:
     users/{uid}            -> profile + role ("user" | "admin")
     vehicles/{id}           -> owned by a user
     serviceRecords/{id}     -> belongs to a vehicle + owner

   SETUP REQUIRED: paste your own Firebase project config below.
   See README.md → "Firebase setup" for step-by-step instructions.
   ============================================================ */

// ---------------------------------------------------------------
// 1. YOUR FIREBASE CONFIG — replace with values from the Firebase
//    console (Project settings → General → Your apps → SDK setup).
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

(() => {
  "use strict";

  // Guard: if the config hasn't been filled in, tell the developer
  // clearly instead of throwing a cryptic Firebase error.
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn(
      "[CarCare+] Firebase config is still a placeholder. " +
      "Auth/database features are disabled until you paste your " +
      "real config into js/firebase-app.js. See README.md."
    );
    document.addEventListener("DOMContentLoaded", () => {
      const loginBtn = document.getElementById("loginBtn");
      const signupBtn = document.getElementById("signupBtn");
      [loginBtn, signupBtn].forEach(btn => {
        if (!btn) return;
        btn.addEventListener("click", () => {
          alert(
            "This demo needs a Firebase project connected.\n\n" +
            "Open js/firebase-app.js and paste your Firebase config " +
            "(see README.md → Firebase setup) to enable real accounts " +
            "and the database."
          );
        });
      });
    });
    return; // stop here — nothing else in this file will run
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const state = {
    user: null,          // firebase auth user object
    role: "user",         // "user" | "admin"
    vehicles: [],          // cached vehicles for the logged-in user
    selectedVehicleId: null,
    unsub: {              // active Firestore listener unsubscribers
      userDoc: null,
      vehicles: null,
      services: null,
      adminUsers: null,
      adminVehicles: null,
      adminServices: null
    }
  };

  // ---------------------------------------------------------------
  // Small DOM helpers
  // ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const fmtMoney = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const fmtDate = (d) => {
    if (!d) return "—";
    const dateObj = typeof d === "string" ? new Date(d) : d.toDate ? d.toDate() : d;
    return dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  let toastTimer = null;
  function toast(message, isError = false) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("toast-error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // ---------------------------------------------------------------
  // Modal helpers (auth / vehicle / service)
  // ---------------------------------------------------------------
  function openModal(backdropId) { $(backdropId).hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(backdropId) { $(backdropId).hidden = true; document.body.style.overflow = ""; }

  function wireModalClose(backdropId, closeBtnId) {
    const backdrop = $(backdropId);
    $(closeBtnId).addEventListener("click", () => closeModal(backdropId));
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdropId); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !backdrop.hidden) closeModal(backdropId);
    });
  }

  // ============================================================
  // AUTH MODAL
  // ============================================================
  wireModalClose("authModalBackdrop", "authModalClose");

  $("loginBtn").addEventListener("click", () => { switchAuthTab("login"); openModal("authModalBackdrop"); });
  $("signupBtn").addEventListener("click", () => { switchAuthTab("signup"); openModal("authModalBackdrop"); });

  document.querySelectorAll(".modal-tab").forEach(tab => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.mode));
  });

  function switchAuthTab(mode) {
    document.querySelectorAll(".modal-tab").forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
    $("loginForm").hidden = mode !== "login";
    $("signupForm").hidden = mode !== "signup";
    $("loginError").textContent = "";
    $("signupError").textContent = "";
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    $("loginError").textContent = "";
    try {
      await auth.signInWithEmailAndPassword(email, password);
      closeModal("authModalBackdrop");
      e.target.reset();
      toast("Welcome back!");
    } catch (err) {
      $("loginError").textContent = friendlyAuthError(err);
    }
  });

  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("signupName").value.trim();
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;
    $("signupError").textContent = "";
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      // Create the Firestore profile doc. Role defaults to "user" —
      // promote to "admin" from the Firebase console or the Admin
      // Panel (see README.md → "Creating your first admin").
      await db.collection("users").doc(cred.user.uid).set({
        name,
        email,
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      closeModal("authModalBackdrop");
      e.target.reset();
      toast("Account created — welcome to CarCare+!");
    } catch (err) {
      $("signupError").textContent = friendlyAuthError(err);
    }
  });

  function friendlyAuthError(err) {
    const map = {
      "auth/email-already-in-use": "That email is already registered — try logging in instead.",
      "auth/invalid-email": "That doesn't look like a valid email address.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/user-not-found": "No account found with that email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password."
    };
    return map[err.code] || err.message;
  }

  $("logoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    $("userMenu").classList.remove("open");
    toast("Logged out");
  });

  // ============================================================
  // USER MENU dropdown
  // ============================================================
  $("userMenuBtn").addEventListener("click", () => {
    const menu = $("userMenu");
    const isOpen = menu.classList.toggle("open");
    $("userMenuBtn").setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (e) => {
    const menu = $("userMenu");
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });

  // ============================================================
  // NAV: switch between marketing site and app shell
  // ============================================================
  function showApp() {
    $("main").hidden = true;
    $("appShell").hidden = false;
    document.querySelectorAll(".marketing-link").forEach(l => l.hidden = true);
    $("navHomeLink").hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  function showMarketing() {
    $("appShell").hidden = true;
    $("main").hidden = false;
    document.querySelectorAll(".marketing-link").forEach(l => l.hidden = false);
    $("navHomeLink").hidden = true;
  }

  $("navHomeLink").addEventListener("click", (e) => { e.preventDefault(); showMarketing(); });
  $("gotoDashboard").addEventListener("click", (e) => {
    e.preventDefault();
    showApp();
    switchAppPanel("myVehicles");
    $("userMenu").classList.remove("open");
  });
  $("gotoAdmin").addEventListener("click", (e) => {
    e.preventDefault();
    showApp();
    switchAppPanel("adminOverview");
    $("userMenu").classList.remove("open");
  });

  // ============================================================
  // APP SIDEBAR — panel switching
  // ============================================================
  document.querySelectorAll(".app-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchAppPanel(btn.dataset.panel));
  });

  function switchAppPanel(panelKey) {
    document.querySelectorAll(".app-nav-btn").forEach(b => b.classList.toggle("active", b.dataset.panel === panelKey));
    document.querySelectorAll(".app-panel").forEach(p => p.hidden = true);
    const panel = $("panel-" + panelKey);
    if (panel) panel.hidden = false;

    if (panelKey === "adminOverview") loadAdminOverview();
    if (panelKey === "adminUsers") loadAdminUsers();
    if (panelKey === "adminVehicles") loadAdminVehicles();
    if (panelKey === "adminServices") loadAdminServices();
  }

  $("backToVehicles").addEventListener("click", () => switchAppPanel("myVehicles"));

  // ============================================================
  // AUTH STATE — the source of truth for the whole app layer
  // ============================================================
  auth.onAuthStateChanged(async (user) => {
    // Tear down any listeners from a previous session first
    Object.keys(state.unsub).forEach(k => { if (state.unsub[k]) { state.unsub[k](); state.unsub[k] = null; } });

    if (!user) {
      state.user = null;
      state.role = "user";
      $("loginBtn").hidden = false;
      $("signupBtn").hidden = false;
      $("userMenu").hidden = true;
      $("gotoAdmin").hidden = true;
      showMarketing();
      return;
    }

    state.user = user;
    $("loginBtn").hidden = true;
    $("signupBtn").hidden = true;
    $("userMenu").hidden = false;
    $("userMenuEmail").textContent = user.email;
    $("userMenuName").textContent = (user.displayName || user.email).split(" ")[0];
    $("userAvatar").textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    $("appUserEmail").textContent = user.email;

    // Live-listen to this user's profile doc for their role
    state.unsub.userDoc = db.collection("users").doc(user.uid).onSnapshot((doc) => {
      const data = doc.data();
      state.role = (data && data.role) || "user";
      const isAdmin = state.role === "admin";
      $("appUserRoleBadge").textContent = state.role;
      $("appUserRoleBadge").className = "badge " + (isAdmin ? "badge-admin" : "badge-user");
      $("gotoAdmin").hidden = !isAdmin;
      document.querySelectorAll(".admin-only").forEach(el => { el.hidden = !isAdmin; });
    }, (err) => console.error("user doc listener error:", err));

    listenUserVehicles(user.uid);
  });

  // ============================================================
  // VEHICLES (user-owned)
  // ============================================================
  wireModalClose("vehicleModalBackdrop", "vehicleModalClose");
  $("openAddVehicle").addEventListener("click", () => openVehicleModal());
  $("openAddVehicleEmpty").addEventListener("click", () => openVehicleModal());

  function openVehicleModal() {
    $("vehicleForm").reset();
    $("vehicleError").textContent = "";
    openModal("vehicleModalBackdrop");
  }

  $("vehicleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.user) return;
    const payload = {
      ownerId: state.user.uid,
      make: $("vMake").value.trim(),
      model: $("vModel").value.trim(),
      year: Number($("vYear").value),
      plate: $("vPlate").value.trim(),
      mileage: Number($("vMileage").value),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection("vehicles").add(payload);
      closeModal("vehicleModalBackdrop");
      toast("Vehicle added");
    } catch (err) {
      $("vehicleError").textContent = err.message;
    }
  });

  function listenUserVehicles(uid) {
    state.unsub.vehicles = db.collection("vehicles")
      .where("ownerId", "==", uid)
      .onSnapshot((snap) => {
        state.vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderVehicleGrid();
      }, (err) => console.error("vehicles listener error:", err));
  }

  function renderVehicleGrid() {
    const grid = $("vehicleGrid");
    const empty = $("vehicleEmptyState");
    grid.querySelectorAll(".vehicle-card").forEach(el => el.remove());

    if (state.vehicles.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    state.vehicles.forEach(v => {
      const card = document.createElement("article");
      card.className = "vehicle-card";
      card.innerHTML = `
        <div class="vehicle-card-top">
          <div>
            <h4>${esc(v.make)} ${esc(v.model)}</h4>
            <span class="plate">${esc(v.plate)} &middot; ${esc(v.year)}</span>
          </div>
        </div>
        <div class="vehicle-card-meta">
          <div><strong>${Number(v.mileage || 0).toLocaleString("en-IN")} km</strong>odometer</div>
        </div>
      `;
      card.addEventListener("click", () => openVehicleDetail(v.id));
      grid.appendChild(card);
    });
  }

  function openVehicleDetail(vehicleId) {
    state.selectedVehicleId = vehicleId;
    const v = state.vehicles.find(x => x.id === vehicleId);
    if (!v) return;

    document.querySelectorAll(".app-panel").forEach(p => p.hidden = true);
    $("panel-vehicleDetail").hidden = false;

    $("vehicleDetailHead").innerHTML = `
      <div>
        <h3>${esc(v.make)} ${esc(v.model)} (${esc(v.year)})</h3>
        <p>${esc(v.plate)} &middot; ${Number(v.mileage || 0).toLocaleString("en-IN")} km on the odometer</p>
      </div>
    `;

    if (state.unsub.services) state.unsub.services();
    state.unsub.services = db.collection("serviceRecords")
      .where("vehicleId", "==", vehicleId)
      .onSnapshot((snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        renderServiceTable(records);
      }, (err) => console.error("services listener error:", err));
  }

  function renderServiceTable(records) {
    const tbody = $("serviceTableBody");
    if (records.length === 0) {
      tbody.innerHTML = `<tr class="loading-row"><td colspan="6">No service records yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${fmtDate(r.date)}</td>
        <td>${esc(r.type)}</td>
        <td class="num">${Number(r.mileageAtService || 0).toLocaleString("en-IN")} km</td>
        <td class="num">${fmtMoney(r.cost)}</td>
        <td>${esc(r.notes || "—")}</td>
        <td><button class="icon-btn" title="Delete record" data-id="${r.id}" aria-label="Delete record">&times;</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".icon-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this service record?")) return;
        await db.collection("serviceRecords").doc(btn.dataset.id).delete();
        toast("Record deleted");
      });
    });
  }

  // ============================================================
  // SERVICE RECORDS
  // ============================================================
  wireModalClose("serviceModalBackdrop", "serviceModalClose");
  $("openAddService").addEventListener("click", () => {
    $("serviceForm").reset();
    $("serviceError").textContent = "";
    openModal("serviceModalBackdrop");
  });

  $("serviceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.user || !state.selectedVehicleId) return;
    const payload = {
      vehicleId: state.selectedVehicleId,
      ownerId: state.user.uid,
      type: $("sType").value.trim(),
      date: $("sDate").value,
      mileageAtService: Number($("sMileage").value),
      cost: Number($("sCost").value),
      notes: $("sNotes").value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection("serviceRecords").add(payload);
      closeModal("serviceModalBackdrop");
      toast("Service logged");
    } catch (err) {
      $("serviceError").textContent = err.message;
    }
  });

  // ============================================================
  // ADMIN PANEL
  // ============================================================
  function loadAdminOverview() {
    Promise.all([
      db.collection("users").get(),
      db.collection("vehicles").get(),
      db.collection("serviceRecords").get()
    ]).then(([usersSnap, vehiclesSnap, servicesSnap]) => {
      const admins = usersSnap.docs.filter(d => d.data().role === "admin").length;
      $("statTotalUsers").textContent = usersSnap.size;
      $("statTotalVehicles").textContent = vehiclesSnap.size;
      $("statTotalServices").textContent = servicesSnap.size;
      $("statTotalAdmins").textContent = admins;
    }).catch(err => console.error("admin overview error:", err));
  }

  function loadAdminUsers() {
    if (state.unsub.adminUsers) return; // already listening
    state.unsub.adminUsers = db.collection("users").onSnapshot((snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      $("adminUsersBody").innerHTML = rows.map(u => `
        <tr>
          <td>${esc(u.name || "—")}</td>
          <td>${esc(u.email)}</td>
          <td>
            <select class="role-select" data-uid="${u.id}">
              <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </td>
          <td>${fmtDate(u.createdAt)}</td>
        </tr>
      `).join("") || `<tr class="loading-row"><td colspan="4">No users yet.</td></tr>`;

      $("adminUsersBody").querySelectorAll(".role-select").forEach(sel => {
        sel.addEventListener("change", async () => {
          await db.collection("users").doc(sel.dataset.uid).update({ role: sel.value });
          toast("Role updated");
        });
      });
    }, (err) => console.error("admin users listener error:", err));
  }

  function loadAdminVehicles() {
    if (state.unsub.adminVehicles) return;
    state.unsub.adminVehicles = db.collection("vehicles").onSnapshot(async (snap) => {
      const vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ownerIds = [...new Set(vehicles.map(v => v.ownerId))];
      const ownerMap = await fetchUsersMap(ownerIds);

      $("adminVehiclesBody").innerHTML = vehicles.map(v => `
        <tr>
          <td>${esc(ownerMap[v.ownerId] || v.ownerId)}</td>
          <td>${esc(v.make)} ${esc(v.model)} (${esc(v.year)})</td>
          <td>${esc(v.plate)}</td>
          <td class="num">${Number(v.mileage || 0).toLocaleString("en-IN")} km</td>
        </tr>
      `).join("") || `<tr class="loading-row"><td colspan="4">No vehicles yet.</td></tr>`;
    }, (err) => console.error("admin vehicles listener error:", err));
  }

  function loadAdminServices() {
    if (state.unsub.adminServices) return;
    state.unsub.adminServices = db.collection("serviceRecords").onSnapshot(async (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const ownerIds = [...new Set(records.map(r => r.ownerId))];
      const vehicleIds = [...new Set(records.map(r => r.vehicleId))];
      const [ownerMap, vehicleMap] = await Promise.all([
        fetchUsersMap(ownerIds),
        fetchVehiclesMap(vehicleIds)
      ]);

      $("adminServicesBody").innerHTML = records.map(r => `
        <tr>
          <td>${esc(ownerMap[r.ownerId] || r.ownerId)}</td>
          <td>${esc(vehicleMap[r.vehicleId] || r.vehicleId)}</td>
          <td>${fmtDate(r.date)}</td>
          <td>${esc(r.type)}</td>
          <td class="num">${fmtMoney(r.cost)}</td>
        </tr>
      `).join("") || `<tr class="loading-row"><td colspan="5">No service records yet.</td></tr>`;
    }, (err) => console.error("admin services listener error:", err));
  }

  const usersMapCache = {};
  async function fetchUsersMap(uids) {
    const missing = uids.filter(id => id && !usersMapCache[id]);
    await Promise.all(missing.map(async (id) => {
      const doc = await db.collection("users").doc(id).get();
      usersMapCache[id] = doc.exists ? (doc.data().name || doc.data().email) : id;
    }));
    const map = {};
    uids.forEach(id => { map[id] = usersMapCache[id]; });
    return map;
  }

  const vehiclesMapCache = {};
  async function fetchVehiclesMap(ids) {
    const missing = ids.filter(id => id && !vehiclesMapCache[id]);
    await Promise.all(missing.map(async (id) => {
      const doc = await db.collection("vehicles").doc(id).get();
      vehiclesMapCache[id] = doc.exists ? `${doc.data().make} ${doc.data().model}` : id;
    }));
    const map = {};
    ids.forEach(id => { map[id] = vehiclesMapCache[id]; });
    return map;
  }

})();
