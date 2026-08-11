/** Small formatting/DOM helpers shared across views. */
(function () {
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    // Manual "$" prefix instead of Intl's currency style — some locales
    // render that as "USD 2,500" or "US$2,500" instead of plain "$2,500".
    const sign = n < 0 ? '-' : '';
    return `${sign}$${Math.round(Math.abs(n)).toLocaleString(undefined)}`;
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

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Native <input type="month"> has no picker UI in Safari, so month
  // selection is built from plain <select>s instead — this supplies the
  // year range for that dropdown, widened to cover any dates passed in.
  function yearOptionsForDates(dateStrings) {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear - 5;
    let maxYear = currentYear;
    dateStrings.forEach((d) => {
      if (!d) return;
      const y = Number(d.slice(0, 4));
      if (y < minYear) minYear = y;
      if (y > maxYear) maxYear = y;
    });
    const years = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }

  window.Helpers = {
    formatCurrency, escapeHtml, saleProfit, emptyState, statusLabel,
    todayLocal, currentMonthLocal, formatMonthLabel, formatDayLabel,
    MONTH_NAMES, yearOptionsForDates,
  };
})();
