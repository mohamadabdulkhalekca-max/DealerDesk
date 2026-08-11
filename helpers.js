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

  window.Helpers = { formatCurrency, escapeHtml, saleProfit, emptyState, statusLabel };
})();
