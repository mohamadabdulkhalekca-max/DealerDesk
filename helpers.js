/** Small formatting/DOM helpers shared across views. */
(function () {
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return n.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function saleProfit(sale, cars) {
    const car = cars.find((c) => c.id === sale.carId);
    if (!car) return 0;
    return Number(sale.salePrice || 0) - Number(car.purchasePrice || 0);
  }

  function emptyState(message) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = message;
    return div;
  }

  function statusLabel(status) {
    return { in_stock: 'In Stock', reserved: 'Reserved', sold: 'Sold' }[status] || status;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function currentMonthLocal() {
    return todayLocal().slice(0, 7);
  }

  function formatMonthLabel(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  function formatDayLabel(dayValue) {
    const [year, month, day] = dayValue.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  window.Helpers = {
    formatCurrency, escapeHtml, saleProfit, emptyState, statusLabel,
    todayLocal, currentMonthLocal, formatMonthLabel, formatDayLabel,
  };
})();
