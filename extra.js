// Extra handlers loaded after script.js
// Handle Enter key for income modal submission
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !document.getElementById('incomeModal').classList.contains('hidden')) {
    const activeElement = document.activeElement;
    if (activeElement.id === 'incomeAmountInput' || activeElement.id === 'incomeNoteInput') {
      submitIncome();
    }
  }
});
