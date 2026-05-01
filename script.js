let data = JSON.parse(localStorage.getItem("keuangan")) || {
  makan: { name: "Dana Makan", saldo: 900000, history: [] },
  bensin: { name: "Dana Bensin", saldo: 500000, history: [] },
  jajan: { name: "Dana Jajan", saldo: 300000, history: [] },
  darurat: { name: "Dana Darurat", saldo: 1000000, history: [] }
};

let currentCategory = null;

function save() {
  localStorage.setItem("keuangan", JSON.stringify(data));
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
    let categoryIncome = 0;
    let categoryExpense = 0;

    for (let item of data[key].history) {
      if (item.type === "income") {
        categoryIncome += item.amount;
      } else if (item.type === "expense") {
        categoryExpense += item.amount;
      }
    }

    const initialBalance = data[key].saldo - categoryIncome + categoryExpense;
    income += initialBalance + categoryIncome;
    expense += categoryExpense;
  }

  return {
    income,
    expense,
    total: income - expense
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
  currentCategory = category;

  document.getElementById("detailPage").classList.remove("hidden");
  document.getElementById("categories").style.display = "none";
  document.getElementById("total").style.display = "none";

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

  cat.history.forEach((item, index) => {
    const typeLabel = item.type === "income" ? "+ Rp " : "- Rp ";
    const typeColor = item.type === "income" ? "#22c55e" : "#ef4444";
    
    historyList.innerHTML += `
      <li style="border-left: 3px solid ${typeColor}; padding-left: 12px;">
        <strong style="color: ${typeColor};">${typeLabel}${formatCurrency(item.amount)}</strong>
        <br><small>${item.note || "-"}</small>
        <br>
        <button onclick="deleteTransaction(${index})">🗑️</button>
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
    note
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
    note
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
  document.getElementById('historyModal').classList.remove('hidden');
  displayHistory();
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
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

function displayHistory() {
  const history = getHistory();
  const historyList = document.getElementById('historyList');
  
  if (history.length === 0) {
    historyList.innerHTML = '<li style="color: var(--muted); text-align: center; padding: 20px;">Tidak ada riwayat perubahan</li>';
    return;
  }

  historyList.innerHTML = '';
  history.forEach((item, index) => {
    const typeLabel = item.type === 'pemasukan' ? '+ Pemasukan' : '- Pengurangan';
    const typeColor = item.type === 'pemasukan' ? '#22c55e' : '#ef4444';
    
    historyList.innerHTML += `
      <li style="border-left: 3px solid ${typeColor}; padding-left: 12px;">
        <strong style="color: ${typeColor};">${typeLabel}</strong><br>
        <span style="font-size: 16px; font-weight: 700;">Rp ${formatCurrency(item.amount)}</span><br>
        <small style="color: var(--muted);">${item.note || '-'}</small><br>
        <small style="color: var(--muted); font-size: 10px;">${item.timestamp}</small>
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
  if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
    delete data[currentCategory];
    save();
    back();
    render();
  }
}

function deleteCategoryFromHome(key, event) {
  event.stopPropagation();
  if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
    delete data[key];
    save();
    render();
  }
}



render();

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