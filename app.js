// app.js

let imports;
let firebaseApp, auth, db;
let appState = {
  user: null,
  category: null,         // "vitamin", "zat", ...
  categoryItemId: null,
  logPeriod: null,        // "pagi", "tengah-hari", ...
  logSupplementId: null,
};

// ---------- Helper UI ----------

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active-view");
}

function promptName(defaultValue = "") {
  const name = window.prompt("Masukkan nama:", defaultValue);
  if (!name) return null;
  return name.trim() === "" ? null : name.trim();
}

// ---------- Firebase init ----------

document.addEventListener("DOMContentLoaded", async () => {
  imports = window._firebaseImports;
  const {
    initializeApp,
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    getFirestore
  } = imports;

  firebaseApp = initializeApp(window.firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  // UI refs
  const btnGoogleLogin = document.getElementById("btn-google-login");
  const btnLogout = document.getElementById("btn-logout");
  const userEmailEl = document.getElementById("user-email");

  const categoryButtons = document.querySelectorAll(".category-btn");
  const btnLogSuplemen = document.getElementById("btn-log-suplemen");
  const btnLogAir = document.getElementById("btn-log-air");

  const btnAddCategoryItem = document.getElementById("btn-add-category-item");
  const categoryTitleEl = document.getElementById("category-title");
  const categoryItemListEl = document.getElementById("category-item-list");

  const detailTitleEl = document.getElementById("detail-title");
  const detailForm = document.getElementById("detail-form");
  const detailFungsi = document.getElementById("detail-fungsi");
  const detailKelebihan = document.getElementById("detail-kelebihan");
  const detailTidakBersama = document.getElementById("detail-tidak-bersama");
  const detailWaktu = document.getElementById("detail-waktu");
  const detailNota = document.getElementById("detail-nota");
  const btnDeleteDetail = document.getElementById("btn-delete-detail");

  const logPeriodButtons = document.querySelectorAll(".log-period-btn");
  const logPeriodTitleEl = document.getElementById("log-period-title");
  const btnAddLogSupplement = document.getElementById("btn-add-log-supplement");
  const logSupplementListEl = document.getElementById("log-supplement-list");
  const logHistoryListEl = document.getElementById("log-history-list");

  const logDetailTitleEl = document.getElementById("log-detail-title");
  const logDetailForm = document.getElementById("log-detail-form");
  const logDetailDos = document.getElementById("log-detail-dos");
  const logDetailStatus = document.getElementById("log-detail-status");
  const btnDeleteLogDetail = document.getElementById("btn-delete-log-detail");

  const btnAddWater = document.getElementById("btn-add-water");
  const waterLogListEl = document.getElementById("water-log-list");
  const todayWaterSummaryEl = document.getElementById("today-water-summary");

  // ---------- Auth handlers ----------

  btnGoogleLogin.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert("Gagal log masuk.");
    }
  });

  btnLogout.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
      alert("Gagal log keluar.");
    }
  });

  onAuthStateChanged(auth, (user) => {
    appState.user = user;
    if (!user) {
      userEmailEl.textContent = "";
      showView("view-login");
    } else {
      userEmailEl.textContent = user.email || "";
      showView("view-main");
    }
  });

  // ---------- Navigation buttons ----------

  document.querySelectorAll("[data-nav='back-main']").forEach(btn => {
    btn.addEventListener("click", () => {
      showView("view-main");
    });
  });

  document.querySelectorAll("[data-nav='back-category']").forEach(btn => {
    btn.addEventListener("click", async () => {
      await loadCategoryList();
      showView("view-category-list");
    });
  });

  document.querySelectorAll("[data-nav='back-log-suplemen']").forEach(btn => {
    btn.addEventListener("click", () => {
      showView("view-log-suplemen");
    });
  });

  document.querySelectorAll("[data-nav='back-log-period']").forEach(btn => {
    btn.addEventListener("click", async () => {
      await loadLogPeriod();
      showView("view-log-period");
    });
  });

  // ---------- Main menu categories ----------

  categoryButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const cat = btn.dataset.category;
      appState.category = cat;
      appState.categoryItemId = null;
      updateCategoryTitle(cat);
      await loadCategoryList();
      showView("view-category-list");
    });
  });

  function updateCategoryTitle(cat) {
    const map = {
      "vitamin": "Vitamin",
      "zat": "Zat",
      "zat-tambahan": "Zat Tambahan",
      "mineral": "Mineral",
      "mineral-jejak": "Mineral Jejak"
    };
    categoryTitleEl.textContent = map[cat] || "";
  }

  // ---------- Category list (Vitamin/Zat/...) ----------

  btnAddCategoryItem.addEventListener("click", async () => {
    const name = promptName();
    if (!name || !appState.user || !appState.category) return;
    const { collection, addDoc, serverTimestamp } = imports;
    try {
      await addDoc(collection(db, "nutrienItems"), {
        userId: appState.user.uid,
        category: appState.category,
        name,
        createdAt: serverTimestamp(),
        fungsi: "",
        kelebihan: "",
        tidakBersama: "",
        waktu: "",
        nota: ""
      });
      await loadCategoryList();
    } catch (err) {
      console.error(err);
      alert("Gagal menambah item.");
    }
  });

  async function loadCategoryList() {
    if (!appState.user || !appState.category) return;
    const { collection, query, where, orderBy, getDocs } = imports;
    categoryItemListEl.innerHTML = "<li>Memuatkan...</li>";
    try {
      const q = query(
        collection(db, "nutrienItems"),
        where("userId", "==", appState.user.uid),
        where("category", "==", appState.category),
        orderBy("name", "asc")
      );
      const snap = await getDocs(q);
      categoryItemListEl.innerHTML = "";
      if (snap.empty) {
        categoryItemListEl.innerHTML = "<li class='empty'>Tiada item lagi.</li>";
        return;
      }
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const li = document.createElement("li");
        li.className = "item-row";

        const nameBtn = document.createElement("button");
        nameBtn.className = "btn link-btn";
        nameBtn.textContent = d.name || "(Tanpa nama)";
        nameBtn.addEventListener("click", async () => {
          appState.categoryItemId = docSnap.id;
          await loadCategoryDetail();
          showView("view-category-detail");
        });

        const editBtn = document.createElement("button");
        editBtn.className = "btn ghost-btn small-btn";
        editBtn.textContent = "Sunting";
        editBtn.addEventListener("click", async () => {
          const newName = promptName(d.name || "");
          if (!newName) return;
          const { doc, updateDoc } = imports;
          await updateDoc(doc(db, "nutrienItems", docSnap.id), {
            name: newName
          });
          await loadCategoryList();
        });

        const delBtn = document.createElement("button");
        delBtn.className = "btn danger-btn small-btn";
        delBtn.textContent = "Buang";
        delBtn.addEventListener("click", async () => {
          if (!confirm("Padam item ini?")) return;
          const { doc, deleteDoc } = imports;
          await deleteDoc(doc(db, "nutrienItems", docSnap.id));
          await loadCategoryList();
        });

        const right = document.createElement("div");
        right.className = "item-row-actions";
        right.appendChild(editBtn);
        right.appendChild(delBtn);

        li.appendChild(nameBtn);
        li.appendChild(right);
        categoryItemListEl.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      alert("Gagal memuatkan senarai.");
    }
  }

  // ---------- Category detail ----------

  async function loadCategoryDetail() {
    const { doc, getDoc } = imports;
    if (!appState.categoryItemId) return;
    const ref = doc(db, "nutrienItems", appState.categoryItemId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("Item tidak dijumpai.");
      return;
    }
    const d = snap.data();
    detailTitleEl.textContent = d.name || "(Tanpa nama)";
    detailFungsi.value = d.fungsi || "";
    detailKelebihan.value = d.kelebihan || "";
    detailTidakBersama.value = d.tidakBersama || "";
    detailWaktu.value = d.waktu || "";
    detailNota.value = d.nota || "";
  }

  detailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!appState.categoryItemId) return;
    const { doc, updateDoc } = imports;
    try {
      await updateDoc(doc(db, "nutrienItems", appState.categoryItemId), {
        fungsi: detailFungsi.value,
        kelebihan: detailKelebihan.value,
        tidakBersama: detailTidakBersama.value,
        waktu: detailWaktu.value,
        nota: detailNota.value
      });
      alert("Disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan.");
    }
  });

  btnDeleteDetail.addEventListener("click", async () => {
    if (!appState.categoryItemId) return;
    if (!confirm("Padam item ini?")) return;
    const { doc, deleteDoc } = imports;
    try {
      await deleteDoc(doc(db, "nutrienItems", appState.categoryItemId));
      appState.categoryItemId = null;
      await loadCategoryList();
      showView("view-category-list");
    } catch (err) {
      console.error(err);
      alert("Gagal memadam.");
    }
  });

  // ---------- Log Suplemen (3f) ----------

  btnLogSuplemen.addEventListener("click", () => {
    showView("view-log-suplemen");
  });

  logPeriodButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const period = btn.dataset.logPeriod;
      appState.logPeriod = period;
      appState.logSupplementId = null;
      updateLogPeriodTitle(period);
      await loadLogPeriod();
      showView("view-log-period");
    });
  });

  function updateLogPeriodTitle(period) {
    const map = {
      "pagi": "Suplemen Pagi",
      "tengah-hari": "Suplemen Tengah Hari",
      "petang": "Suplemen Petang",
      "malam": "Suplemen Malam"
    };
    logPeriodTitleEl.textContent = map[period] || "";
  }

  btnAddLogSupplement.addEventListener("click", async () => {
    const name = promptName();
    if (!name || !appState.user || !appState.logPeriod) return;
    const { collection, addDoc, serverTimestamp } = imports;
    try {
      await addDoc(collection(db, "suplemenItems"), {
        userId: appState.user.uid,
        period: appState.logPeriod,
        name,
        createdAt: serverTimestamp(),
        dos: "",
        status: ""
      });
      await loadLogPeriod();
    } catch (err) {
      console.error(err);
      alert("Gagal menambah suplemen.");
    }
  });

  async function loadLogPeriod() {
    if (!appState.user || !appState.logPeriod) return;
    const { collection, query, where, orderBy, getDocs } = imports;

    // Senarai suplemen
    logSupplementListEl.innerHTML = "<li>Memuatkan...</li>";
    try {
      const q = query(
        collection(db, "suplemenItems"),
        where("userId", "==", appState.user.uid),
        where("period", "==", appState.logPeriod),
        orderBy("name", "asc")
      );
      const snap = await getDocs(q);
      logSupplementListEl.innerHTML = "";
      if (snap.empty) {
        logSupplementListEl.innerHTML = "<li class='empty'>Tiada suplemen lagi.</li>";
      } else {
        snap.forEach(docSnap => {
          const d = docSnap.data();
          const li = document.createElement("li");
          li.className = "item-row";

          const nameBtn = document.createElement("button");
          nameBtn.className = "btn link-btn";
          nameBtn.textContent = d.name || "(Tanpa nama)";
          nameBtn.addEventListener("click", async () => {
            appState.logSupplementId = docSnap.id;
            await loadLogSupplementDetail();
            showView("view-log-detail");
          });

          const saveLogBtn = document.createElement("button");
          saveLogBtn.className = "btn primary-btn small-btn";
          saveLogBtn.textContent = "Simpan ke Log";
          saveLogBtn.addEventListener("click", async () => {
            await saveSupplementToHistory(docSnap.id, d.name || "");
            await loadLogHistory();
          });

          const editBtn = document.createElement("button");
          editBtn.className = "btn ghost-btn small-btn";
          editBtn.textContent = "Sunting";
          editBtn.addEventListener("click", async () => {
            const newName = promptName(d.name || "");
            if (!newName) return;
            const { doc, updateDoc } = imports;
            await updateDoc(doc(db, "suplemenItems", docSnap.id), {
              name: newName
            });
            await loadLogPeriod();
          });

          const delBtn = document.createElement("button");
          delBtn.className = "btn danger-btn small-btn";
          delBtn.textContent = "Buang";
          delBtn.addEventListener("click", async () => {
            if (!confirm("Padam suplemen ini?")) return;
            const { doc, deleteDoc } = imports;
            await deleteDoc(doc(db, "suplemenItems", docSnap.id));
            await loadLogPeriod();
          });

          const right = document.createElement("div");
          right.className = "item-row-actions";
          right.appendChild(saveLogBtn);
          right.appendChild(editBtn);
          right.appendChild(delBtn);

          li.appendChild(nameBtn);
          li.appendChild(right);

          logSupplementListEl.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memuatkan senarai suplemen.");
    }

    // History
    await loadLogHistory();
  }

  async function saveSupplementToHistory(supplementId, name) {
    const { collection, addDoc, serverTimestamp } = imports;
    if (!appState.user || !appState.logPeriod) return;
    try {
      await addDoc(collection(db, "suplemenLogs"), {
        userId: appState.user.uid,
        period: appState.logPeriod,
        supplementId,
        name,
        createdAt: serverTimestamp()
      });
      alert("Disimpan ke log.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan ke log.");
    }
  }

  async function loadLogHistory() {
    if (!appState.user || !appState.logPeriod) return;
    const { collection, query, where, orderBy, getDocs } = imports;
    logHistoryListEl.innerHTML = "<li>Memuatkan...</li>";
    try {
      const q = query(
        collection(db, "suplemenLogs"),
        where("userId", "==", appState.user.uid),
        where("period", "==", appState.logPeriod),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      logHistoryListEl.innerHTML = "";
      if (snap.empty) {
        logHistoryListEl.innerHTML = "<li class='empty'>Belum ada log.</li>";
        return;
      }
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const li = document.createElement("li");
        li.textContent = `${d.name || "Suplemen"} — ${d.createdAt?.toDate?.().toLocaleString() || ""}`;
        logHistoryListEl.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      logHistoryListEl.innerHTML = "<li class='empty'>Gagal memuatkan log.</li>";
    }
  }

  // ---------- Log Suplemen detail ----------

  async function loadLogSupplementDetail() {
    const { doc, getDoc } = imports;
    if (!appState.logSupplementId) return;
    const ref = doc(db, "suplemenItems", appState.logSupplementId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("Suplemen tidak dijumpai.");
      return;
    }
    const d = snap.data();
    logDetailTitleEl.textContent = d.name || "(Tanpa nama)";
    logDetailDos.value = d.dos || "";
    logDetailStatus.value = d.status || "";
  }

  logDetailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!appState.logSupplementId) return;
    const { doc, updateDoc } = imports;
    try {
      await updateDoc(doc(db, "suplemenItems", appState.logSupplementId), {
        dos: logDetailDos.value,
        status: logDetailStatus.value
      });
      alert("Disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan.");
    }
  });

  btnDeleteLogDetail.addEventListener("click", async () => {
    if (!appState.logSupplementId) return;
    if (!confirm("Padam suplemen ini?")) return;
    const { doc, deleteDoc } = imports;
    try {
      await deleteDoc(doc(db, "suplemenItems", appState.logSupplementId));
      appState.logSupplementId = null;
      await loadLogPeriod();
      showView("view-log-period");
    } catch (err) {
      console.error(err);
      alert("Gagal memadam.");
    }
  });

  // ---------- Log Air ----------

  btnLogAir.addEventListener("click", async () => {
    await loadWaterLog();
    showView("view-log-air");
  });

  btnAddWater.addEventListener("click", async () => {
    if (!appState.user) return;
    const input = window.prompt("Tambah jumlah air (ML):");
    if (!input) return;
    const amount = parseInt(input, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Sila masukkan nombor ml yang sah.");
      return;
    }
    const { collection, addDoc, serverTimestamp } = imports;
    try {
      await addDoc(collection(db, "waterLogs"), {
        userId: appState.user.uid,
        amount,
        createdAt: serverTimestamp()
      });
      await loadWaterLog();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan log air.");
    }
  });

  async function loadWaterLog() {
    if (!appState.user) return;
    const { collection, query, where, orderBy, getDocs } = imports;
    waterLogListEl.innerHTML = "<li>Memuatkan...</li>";
    todayWaterSummaryEl.textContent = "";
    try {
      const q = query(
        collection(db, "waterLogs"),
        where("userId", "==", appState.user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      waterLogListEl.innerHTML = "";
      if (snap.empty) {
        waterLogListEl.innerHTML = "<li class='empty'>Belum ada log.</li>";
        return;
      }

      let todayTotal = 0;
      const today = new Date();
      const todayKey = today.toDateString();

      snap.forEach(docSnap => {
        const d = docSnap.data();
        const li = document.createElement("li");
        const date = d.createdAt?.toDate?.() || new Date();
        li.textContent = `${d.amount} ml — ${date.toLocaleString()}`;
        waterLogListEl.appendChild(li);

        if (date.toDateString() === todayKey) {
          todayTotal += d.amount || 0;
        }
      });

      todayWaterSummaryEl.textContent = `Hari ini anda telah minum kira-kira ${todayTotal} ml air.`;
    } catch (err) {
      console.error(err);
      waterLogListEl.innerHTML = "<li class='empty'>Gagal memuatkan log air.</li>";
    }
  }

  // ---------- PWA: register service worker ----------

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("SW reg failed:", err);
      });
    });
  }

  // Mula dengan loading, auth listener akan tukar view
  showView("view-loading");
});
