let data = JSON.parse(localStorage.getItem("keuangan")) || {
  makan: { name: "Dana Makan", saldo: 0, history: [] },
  bensin: { name: "Dana Bensin", saldo: 0, history: [] },
  jajan: { name: "Dana Jajan", saldo: 0, history: [] },
  darurat: { name: "Dana Darurat", saldo: 0, history: [] }
};

let currentCategory = null;
let currentMainPage = 'home';

function save() {
  localStorage.setItem("keuangan", JSON.stringify(data));
}

function setTopWalletActionsVisible(visible) {
  const editBtn = document.getElementById("editTotalBtn");

  if (editBtn) editBtn.style.display = visible ? "inline-block" : "none";
}

function switchMainPage(page) {
  const homePage = document.getElementById('homePage');
  const recapPage = document.getElementById('recapPage');
  const historyPage = document.getElementById('historyPage');
  const navHomeBtn = document.getElementById('navHomeBtn');
  const navRecapBtn = document.getElementById('navRecapBtn');
  const navHistoryBtn = document.getElementById('navHistoryBtn');

  currentMainPage = page;

  const leaveDetailMode = () => {
    document.getElementById("detailPage").classList.add("hidden");
    document.getElementById("categories").style.display = "grid";
    document.getElementById("total").style.display = "block";
    currentCategory = null;
  };

  if (page === 'recap') {
    homePage.classList.add('hidden');
    recapPage.classList.remove('hidden');
    historyPage.classList.add('hidden');
    navHomeBtn.classList.remove('active');
    navRecapBtn.classList.add('active');
    navHistoryBtn.classList.remove('active');

    // Close detail state when user leaves Home page
    leaveDetailMode();

    setTopWalletActionsVisible(false);
    renderRecapLists();
    return;
  }

  if (page === 'history') {
    homePage.classList.add('hidden');
    recapPage.classList.add('hidden');
    historyPage.classList.remove('hidden');
    navHomeBtn.classList.remove('active');
    navRecapBtn.classList.remove('active');
    navHistoryBtn.classList.add('active');

    leaveDetailMode();
    setTopWalletActionsVisible(false);
    displayHistory();
    return;
  }

  recapPage.classList.add('hidden');
  historyPage.classList.add('hidden');
  homePage.classList.remove('hidden');
  navRecapBtn.classList.remove('active');
  navHistoryBtn.classList.remove('active');
  navHomeBtn.classList.add('active');
  setTopWalletActionsVisible(currentCategory === null);
}

function getCurrentPeriodKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getPeriodLabel(periodKey) {
  const [year, month] = periodKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function getMonthlyRecaps() {
  const raw = localStorage.getItem('monthly_recaps');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveMonthlyRecaps(recaps) {
  localStorage.setItem('monthly_recaps', JSON.stringify(recaps));
}

function getRecapMeta() {
  const raw = localStorage.getItem('recap_meta');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveRecapMeta(meta) {
  localStorage.setItem('recap_meta', JSON.stringify(meta));
}

function buildMonthlySnapshot(periodKey) {
  const summary = getFinancialSummary();
  const categories = [];

  for (let key in data) {
    let income = 0;
    let expense = 0;

    for (let item of data[key].history) {
      if (item.type === 'income') income += item.amount;
      if (item.type === 'expense') expense += item.amount;
    }

    categories.push({
      key,
      name: data[key].name,
      saldo: data[key].saldo,
      income,
      expense,
      transactionCount: data[key].history.length
    });
  }

  return {
    period: periodKey,
    label: getPeriodLabel(periodKey),
    totalSaldo: summary.total,
    totalIncome: summary.income,
    totalExpense: summary.expense,
    categories,
    createdAt: new Date().toLocaleString('id-ID')
  };
}

function upsertMonthlyRecap(snapshot) {
  const recaps = getMonthlyRecaps();
  const idx = recaps.findIndex(r => r.period === snapshot.period);

  if (idx >= 0) {
    recaps[idx] = snapshot;
  } else {
    recaps.push(snapshot);
  }

  saveMonthlyRecaps(recaps);
}

function resetAllCategoriesForNewMonth() {
  for (let key in data) {
    data[key].saldo = 0;
    data[key].history = [];
  }

  localStorage.setItem('total_keuangan', '0');
}

function ensureMonthlyRollover() {
  const nowPeriod = getCurrentPeriodKey();
  const meta = getRecapMeta();

  if (!meta || !meta.activePeriod) {
    saveRecapMeta({ activePeriod: nowPeriod, lastCheckedAt: new Date().toISOString() });
    return;
  }

  if (meta.activePeriod === nowPeriod) {
    saveRecapMeta({ ...meta, lastCheckedAt: new Date().toISOString() });
    return;
  }

  const snapshot = buildMonthlySnapshot(meta.activePeriod);
  upsertMonthlyRecap(snapshot);

  resetAllCategoriesForNewMonth();
  save();

  saveRecapMeta({
    activePeriod: nowPeriod,
    lastCheckedAt: new Date().toISOString(),
    lastResetAt: new Date().toLocaleString('id-ID')
  });
}

function render() {
  let categoriesDiv = document.getElementById("categories");
  categoriesDiv.innerHTML = "";

  const summary = getFinancialSummary();
  const totalSaldo = summary.total;

  for (let key in data) {
    const isBudgetExceeded = data[key].saldo > totalSaldo;
    const displayValue = isBudgetExceeded ? -data[key].saldo : data[key].saldo;
    const saldoColor = isBudgetExceeded ? 'color: #dc2626;' : '';
    
    categoriesDiv.innerHTML += `
      <div class="card-container">
        <button class="delete-btn" onclick="deleteCategoryFromHome('${key}', event)">🗑️</button>
        <div class="card" onclick="openCategory('${key}')">
          <h3>${data[key].name}</h3>
          <p style="${saldoColor}">Rp ${formatCurrency(displayValue)}</p>
        </div>
      </div>
    `;
  }

  categoriesDiv.innerHTML += `
    <div class="card-container add-card" onclick="addCategory()" role="button" tabindex="0">
      <span>+</span>
    </div>
  `;

  const totalEl = document.getElementById("total");
  totalEl.innerText = "Rp " + formatCurrency(summary.total);
  totalEl.classList.toggle('negative', summary.total < 0);
  totalEl.classList.toggle('positive', summary.total >= 0);

  const statIncomeEl = document.getElementById("statIncome");
  const statExpenseEl = document.getElementById("statExpense");
  const statNetEl = document.getElementById("statNet");

  statIncomeEl.innerText = "Rp " + formatCurrency(summary.income);
  statExpenseEl.innerText = "Rp " + formatCurrency(summary.expense);
  statNetEl.innerText = "Rp " + formatCurrency(summary.total);
}

function getFinancialSummary() {
  let income = 0;
  let expense = 0;

  for (let key in data) {
    for (let item of data[key].history) {
      if (item.type === "income") {
        income += item.amount;
      } else if (item.type === "expense") {
        expense += item.amount;
      }
    }
  }

  const manualTotal = getManualTotal();
  const fallbackTotal = Object.values(data).reduce((sum, cat) => sum + (cat.saldo || 0), 0);

  return {
    income,
    expense,
    total: manualTotal !== null ? manualTotal : fallbackTotal
  };
}

function formatCurrency(num) {
  // ensure integer
  const n = Math.round(num);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  // Indonesian thousands separator '.'
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function openCategory(category) {
  switchMainPage('home');
  currentCategory = category;

  document.getElementById("detailPage").classList.remove("hidden");
  document.getElementById("categories").style.display = "none";
  document.getElementById("total").style.display = "none";
  setTopWalletActionsVisible(false);

  updateDetail();
}

function updateDetail() {
  let cat = data[currentCategory];
  const totalSaldo = getFinancialSummary().total;
  const isBudgetExceeded = cat.saldo > totalSaldo;
  const displayValue = isBudgetExceeded ? -cat.saldo : cat.saldo;

  document.getElementById("categoryTitle").innerText = data[currentCategory].name;
  const categoryAmountEl = document.getElementById("categoryAmount");
  categoryAmountEl.innerText = "Saldo: Rp " + formatCurrency(displayValue);
  categoryAmountEl.style.color = isBudgetExceeded ? '#dc2626' : '#0c4a6e';

  // display history
  let historyList = document.getElementById("history");
  historyList.innerHTML = "";

  // Retrofill missing timestamps for existing category history entries
  let _changed = false;
  cat.history.forEach(it => {
    if (!it.timestamp) {
      it.timestamp = new Date().toLocaleString('id-ID');
      _changed = true;
    }
  });
  if (_changed) save();

  cat.history.forEach((item, index) => {
    const typeLabel = item.type === "income" ? "+ Rp " : "- Rp ";
    const typeColor = item.type === "income" ? "#22c55e" : "#ef4444";
    
    historyList.innerHTML += `
      <li style="border-left: 3px solid ${typeColor}; padding-left: 12px;">
        <strong style="color: ${typeColor};">${typeLabel}${formatCurrency(item.amount)}</strong>
        <br><small>${item.note || "-"}</small>
        <br><small style="color: var(--muted); font-size: 11px;">📅 ${item.timestamp || ""}</small>
        <br>
        <button onclick="openDeleteTransactionModal(${index})">🗑️</button>
      </li>
    `;
  });
}

function deleteTransaction(index) {
  let item = data[currentCategory].history[index];

  if (item.type === "income") {
    data[currentCategory].saldo -= item.amount;
  } else {
    data[currentCategory].saldo += item.amount;
  }

  data[currentCategory].history.splice(index, 1);

  save();
  updateDetail();
  render();
}

function addIncome() {
  let amount = parseInt(document.getElementById("amountInput").value);
  let note = document.getElementById("noteInput").value;

  if (!amount) return;

  data[currentCategory].saldo += amount;
  data[currentCategory].history.push({
    type: "income",
    amount,
    note,
    timestamp: new Date().toLocaleString('id-ID')
  });

  clearInput();
  save();
  updateDetail();
  render();
}

function addExpense() {
  let amount = parseInt(document.getElementById("amountInput").value);
  let note = document.getElementById("noteInput").value;

  if (!amount) return;

  data[currentCategory].saldo -= amount;
  data[currentCategory].history.push({
    type: "expense",
    amount,
    note,
    timestamp: new Date().toLocaleString('id-ID')
  });

  clearInput();
  save();
  updateDetail();
  render();
}

function deleteTransaction(index) {
  let item = data[currentCategory].history[index];

  if (item.type === "income") {
    data[currentCategory].saldo -= item.amount;
  } else {
    data[currentCategory].saldo += item.amount;
  }

  data[currentCategory].history.splice(index, 1);

  save();
  updateDetail();
  render();
}

function editTransaction(index) {
  let item = data[currentCategory].history[index];

  let newAmount = prompt("Edit jumlah:", item.amount);
  let newNote = prompt("Edit keterangan:", item.note);

  if (!newAmount) return;

  newAmount = parseInt(newAmount);

  // Balikin saldo lama
  if (item.type === "income") {
    data[currentCategory].saldo -= item.amount;
  } else {
    data[currentCategory].saldo += item.amount;
  }

  // Update data
  item.amount = newAmount;
  item.note = newNote;

  // Hitung ulang saldo
  if (item.type === "income") {
    data[currentCategory].saldo += newAmount;
  } else {
    data[currentCategory].saldo -= newAmount;
  }

  save();
  updateDetail();
  render();
}

function addCategory() {
  document.getElementById("categoryNameInput").value = "";
  document.getElementById("addCategoryModal").classList.remove("hidden");
  document.getElementById("categoryNameInput").focus();
}

function closeAddCategoryModal() {
  document.getElementById("addCategoryModal").classList.add("hidden");
}

function submitAddCategory() {
  let name = document.getElementById("categoryNameInput").value.trim();
  let balance = parseInt(document.getElementById("categoryBalanceInput").value) || 0;
  
  if (!name) {
    alert("Nama kategori tidak boleh kosong!");
    return;
  }

  // bikin key aman (lowercase + tanpa spasi)
  let key = name.toLowerCase().replace(/\s+/g, "_");

  // cek kalau sudah ada
  if (data[key]) {
    alert("Kategori sudah ada!");
    return;
  }

  // buat kategori baru
  data[key] = {
    name: name,
    saldo: balance,
    history: []
  };

  save();
  render();
  closeAddCategoryModal();
}

function getTotalExpenses() {
  return getFinancialSummary().expense;
}

function getManualTotal() {
  const v = localStorage.getItem('total_keuangan');
  if (!v) return null;
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

function openEditTotalModal() {
  const currentTotal = getManualTotal() || 0;
  document.getElementById('editTotalInput').value = currentTotal;
  document.getElementById('editTotalNoteInput').value = '';
  document.getElementById('editTotalModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('editTotalInput').focus(), 60);
}

function closeEditTotalModal() {
  document.getElementById('editTotalModal').classList.add('hidden');
}

function submitEditTotal() {
  const amountEl = document.getElementById('editTotalInput');
  const noteEl = document.getElementById('editTotalNoteInput');

  let amount = parseInt(amountEl.value);
  if (isNaN(amount)) {
    alert('Masukkan nominal yang valid (angka)');
    return;
  }

  const oldTotal = getManualTotal() || 0;
  const change = amount - oldTotal;

  // store new total
  localStorage.setItem('total_keuangan', String(amount));

  // add to history
  const history = getHistory();
  history.push({
    type: change >= 0 ? 'pemasukan' : 'pengurangan',
    amount: Math.abs(change),
    note: noteEl.value || '',
    timestamp: new Date().toLocaleString('id-ID')
  });
  saveHistory(history);

  render();
  closeEditTotalModal();
}

function openHistoryModal() {
  switchMainPage('history');
}

function closeHistoryModal() {
  switchMainPage('home');
}

function renderRecapLists() {
  const monthlyEl = document.getElementById('monthlyRecapList');
  const yearlyEl = document.getElementById('yearlyRecapList');
  const recaps = getMonthlyRecaps().sort((a, b) => b.period.localeCompare(a.period));

  if (recaps.length === 0) {
    monthlyEl.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">Belum ada rekap bulanan.</li>';
    yearlyEl.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">Belum ada rekap tahunan.</li>';
    return;
  }

  monthlyEl.innerHTML = '';
  recaps.forEach((recap) => {
    const categoryRows = recap.categories.map((cat) => {
      return `<div class="recap-cat-row"><span>${cat.name}</span><span>Rp ${formatCurrency(cat.saldo)}</span></div>`;
    }).join('');

    monthlyEl.innerHTML += `
      <li>
        <div class="recap-month-header">
          <span class="recap-month-title">${recap.label}</span>
          <span class="recap-pill">${recap.period}</span>
        </div>

        <div class="recap-grid">
          <div class="recap-item"><span class="label">Pemasukan</span><span class="value">Rp ${formatCurrency(recap.totalIncome)}</span></div>
          <div class="recap-item"><span class="label">Pengeluaran</span><span class="value">Rp ${formatCurrency(recap.totalExpense)}</span></div>
          <div class="recap-item"><span class="label">Saldo Akhir</span><span class="value">Rp ${formatCurrency(recap.totalSaldo)}</span></div>
        </div>

        <div class="recap-categories">${categoryRows}</div>
      </li>
    `;
  });

  const yearlyMap = {};
  recaps.forEach((recap) => {
    const year = recap.period.slice(0, 4);

    if (!yearlyMap[year]) {
      yearlyMap[year] = {
        months: 0,
        income: 0,
        expense: 0,
        endingSaldoTotal: 0
      };
    }

    yearlyMap[year].months += 1;
    yearlyMap[year].income += recap.totalIncome || 0;
    yearlyMap[year].expense += recap.totalExpense || 0;
    yearlyMap[year].endingSaldoTotal += recap.totalSaldo || 0;
  });

  const years = Object.keys(yearlyMap).sort((a, b) => b.localeCompare(a));
  yearlyEl.innerHTML = '';

  years.forEach((year) => {
    const item = yearlyMap[year];
    yearlyEl.innerHTML += `
      <li>
        <div class="recap-month-header">
          <span class="recap-month-title">${year}</span>
          <span class="recap-pill">${item.months} bulan</span>
        </div>
        <div class="recap-year-row">
          <span>Total Pemasukan: Rp ${formatCurrency(item.income)}</span>
          <span>Total Pengeluaran: Rp ${formatCurrency(item.expense)}</span>
          <span>Akumulasi Saldo Akhir: Rp ${formatCurrency(item.endingSaldoTotal)}</span>
        </div>
      </li>
    `;
  });
}

function getHistory() {
  const v = localStorage.getItem('total_history');
  if (!v) return [];
  try {
    return JSON.parse(v);
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem('total_history', JSON.stringify(history));
}

function deleteHistoryItem(index) {
  const history = getHistory();
  
  if (index >= 0 && index < history.length) {
    history.splice(index, 1);
    saveHistory(history);
    displayHistory();
  }
}

function displayHistory() {
  const history = getHistory();
  const historyList = document.getElementById('historyList');
  
  if (history.length === 0) {
    historyList.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">Tidak ada riwayat perubahan</li>';
    return;
  }

  historyList.innerHTML = '';
  // Retrofill missing timestamps for total history entries
  let __changed = false;
  history.forEach(h => {
    if (!h.timestamp) {
      h.timestamp = new Date().toLocaleString('id-ID');
      __changed = true;
    }
  });
  if (__changed) saveHistory(history);

  history.forEach((item) => {
    const typeLabel = item.type === 'pemasukan' ? '+ Pemasukan' : '- Pengurangan';
    const typeColor = item.type === 'pemasukan' ? '#22c55e' : '#ef4444';
    
    historyList.innerHTML += `
      <li style="border-left: 3px solid ${typeColor}; padding-left: 12px;">
        <strong style="color: ${typeColor};">${typeLabel}</strong><br>
        <span style="font-size: 16px; font-weight: 700;">Rp ${formatCurrency(item.amount)}</span><br>
        <small style="color: var(--muted);">${item.note || '-'}</small><br>
        <small style="color: var(--muted); font-size: 11px;">📅 ${item.timestamp || ""}</small><br>
        <button onclick="deleteHistoryItem(${index})" style="margin-top: 6px;">🗑️</button>
      </li>
    `;
  });
}

function clearInput() {
  document.getElementById("amountInput").value = "";
  document.getElementById("noteInput").value = "";
}

function back() {
  document.getElementById("detailPage").classList.add("hidden");

  document.getElementById("categories").style.display = "grid";
  document.getElementById("total").style.display = "block";
  setTopWalletActionsVisible(true);

  currentCategory = null; // 🔥 penting biar reset state
}

function openEditNameModal() {
  const cat = data[currentCategory];
  document.getElementById('editNameInput').value = cat.name;
  document.getElementById('editNameModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('editNameInput').focus(), 60);
}

function closeEditNameModal() {
  document.getElementById('editNameModal').classList.add('hidden');
}

function submitEditName() {
  const nameInput = document.getElementById('editNameInput');
  const newName = nameInput.value.trim();

  if (!newName) {
    alert('Nama kategori tidak boleh kosong!');
    return;
  }

  data[currentCategory].name = newName;
  save();
  updateDetail();
  render();
  closeEditNameModal();
}

function openEditBalanceModal() {
  const cat = data[currentCategory];
  document.getElementById('editBalanceInput').value = cat.saldo;
  document.getElementById('editBalanceModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('editBalanceInput').focus(), 60);
}

function closeEditBalanceModal() {
  document.getElementById('editBalanceModal').classList.add('hidden');
}

function submitEditBalance() {
  const balanceInput = document.getElementById('editBalanceInput');
  const newBalance = parseInt(balanceInput.value);

  if (isNaN(newBalance)) {
    alert('Saldo harus berupa angka!');
    return;
  }

  data[currentCategory].saldo = newBalance;
  save();
  updateDetail();
  render();
  closeEditBalanceModal();
}

function editCategoryName() {
  openEditNameModal();
}

function editCategoryBalance() {
  openEditBalanceModal();
}

function deleteCategory() {
  openDeleteCategoryModal(currentCategory);
}

function deleteCategoryFromHome(key, event) {
  event.stopPropagation();
  openDeleteCategoryModal(key);
}

function openDeleteCategoryModal(key) {
  const modal = document.getElementById('deleteCategoryModal');
  const title = document.getElementById('deleteCategoryTitle');
  const desc = document.getElementById('deleteCategoryDesc');

  if (!modal || !title || !desc || !key || !data[key]) return;

  modal.dataset.categoryKey = key;
  title.textContent = `Hapus ${data[key].name}?`;
  desc.textContent = 'Kategori ini akan dihapus beserta saldo dan seluruh riwayat transaksinya.';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDeleteCategoryModal() {
  const modal = document.getElementById('deleteCategoryModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  delete modal.dataset.categoryKey;
}

function confirmDeleteCategory() {
  const modal = document.getElementById('deleteCategoryModal');
  const key = modal && modal.dataset.categoryKey;

  if (!key || !data[key]) {
    closeDeleteCategoryModal();
    return;
  }

  const deletingCurrentCategory = currentCategory === key;

  delete data[key];
  save();

  if (deletingCurrentCategory) {
    back();
  }

  render();
  closeDeleteCategoryModal();
}

// Transaction delete confirmation
function openDeleteTransactionModal(index) {
  const modal = document.getElementById('deleteTransactionModal');
  if (!modal) return;

  modal.dataset.transactionIndex = index;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDeleteTransactionModal() {
  const modal = document.getElementById('deleteTransactionModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  delete modal.dataset.transactionIndex;
}

function confirmDeleteTransaction() {
  const modal = document.getElementById('deleteTransactionModal');
  const index = modal && modal.dataset.transactionIndex;

  if (index === undefined || !data[currentCategory]) {
    closeDeleteTransactionModal();
    return;
  }

  const item = data[currentCategory].history[index];

  if (item.type === "income") {
    data[currentCategory].saldo -= item.amount;
  } else {
    data[currentCategory].saldo += item.amount;
  }

  data[currentCategory].history.splice(index, 1);

  save();
  updateDetail();
  render();
  closeDeleteTransactionModal();
}

// Sidebar controls (header hamburger)
function openSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sb || !overlay) return;
  sb.classList.remove('hidden');
  overlay.classList.remove('hidden');
  sb.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sb || !overlay) return;
  sb.classList.add('hidden');
  overlay.classList.add('hidden');
  sb.setAttribute('aria-hidden', 'true');
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  if (sb.classList.contains('hidden')) openSidebar(); else closeSidebar();
}

function closeSidebarPopup() {
  const popup = document.getElementById('sidebarPopupModal');
  if (!popup) return;
  popup.classList.add('hidden');
  popup.setAttribute('aria-hidden', 'true');
}

function openSidebarPopup(type) {
  const popup = document.getElementById('sidebarPopupModal');
  const kicker = document.getElementById('sidebarPopupKicker');
  const title = document.getElementById('sidebarPopupTitle');
  const body = document.getElementById('sidebarPopupBody');

  if (!popup || !kicker || !title || !body) return;

  closeSidebar();

  const configs = {
    settings: {
      kicker: 'Preferensi',
      title: 'Pengaturan',
      body: `
        <p class="sidebar-popup-desc">Atur pengalaman aplikasi agar lebih nyaman dipakai harian.</p>
        <div class="sidebar-popup-card sidebar-popup-stack">
          <label class="sidebar-toggle-row"><span>Mode hemat data</span><input type="checkbox" checked></label>
          <label class="sidebar-toggle-row"><span>Notifikasi ringkasan</span><input type="checkbox"></label>
          <label class="sidebar-toggle-row"><span>Format rupiah otomatis</span><input type="checkbox" checked></label>
          <div class="sidebar-popup-actions">
            <button class="btn-submit" type="button" onclick="closeSidebarPopup()">Simpan</button>
            <button class="btn-cancel" type="button" onclick="closeSidebarPopup()">Tutup</button>
          </div>
        </div>
      `
    },
    about: {
      kicker: 'Tentang',
      title: 'Tentang SiCatat',
      body: `
        <div class="sidebar-popup-card sidebar-popup-about">
          <div class="sidebar-about-logo">SC</div>
          <p class="sidebar-popup-desc">SiCatat adalah aplikasi catatan keuangan pribadi untuk memantau saldo, rekap, dan riwayat perubahan.</p>
          <div class="sidebar-about-meta">
            <span>Versi 1.0</span>
            <span>Dibuat untuk pencatatan sederhana</span>
            <br>
            <span> Develop by @ramdfin </span>
          </div>
          <div class="sidebar-popup-actions">
            <button class="btn-submit" type="button" onclick="closeSidebarPopup()">Tutup</button>
          </div>
        </div>
      `
    }
  };

  const config = configs[type] || configs.about;

  kicker.textContent = config.kicker;
  title.textContent = config.title;
  body.innerHTML = config.body;
  popup.classList.remove('hidden');
  popup.setAttribute('aria-hidden', 'false');
}

// Close popups on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const deleteTransactionModal = document.getElementById('deleteTransactionModal');
    if (deleteTransactionModal && !deleteTransactionModal.classList.contains('hidden')) {
      closeDeleteTransactionModal();
      return;
    }

    const deleteModal = document.getElementById('deleteCategoryModal');
    if (deleteModal && !deleteModal.classList.contains('hidden')) {
      closeDeleteCategoryModal();
      return;
    }

    const popup = document.getElementById('sidebarPopupModal');
    if (popup && !popup.classList.contains('hidden')) {
      closeSidebarPopup();
      return;
    }

    const sb = document.getElementById('sidebar');
    if (sb && !sb.classList.contains('hidden')) closeSidebar();
  }
});

ensureMonthlyRollover();
render();
switchMainPage('home');

// Allow Enter key to submit form
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (!document.getElementById('addCategoryModal').classList.contains('hidden')) {
      const activeElement = document.activeElement;
      if (activeElement.id === 'categoryNameInput' || activeElement.id === 'categoryBalanceInput') {
        submitAddCategory();
      }
    }

    if (!document.getElementById('editTotalModal').classList.contains('hidden')) {
      const activeElement2 = document.activeElement;
      if (activeElement2.id === 'editTotalInput' || activeElement2.id === 'editTotalNoteInput') {
        submitEditTotal();
      }
    }

    if (!document.getElementById('editNameModal').classList.contains('hidden')) {
      const activeElement3 = document.activeElement;
      if (activeElement3.id === 'editNameInput') {
        submitEditName();
      }
    }

    if (!document.getElementById('editBalanceModal').classList.contains('hidden')) {
      const activeElement4 = document.activeElement;
      if (activeElement4.id === 'editBalanceInput') {
        submitEditBalance();
      }
    }
  }
});