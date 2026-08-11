/** Dashboard view: key stats + recent sales. */
(function () {
  function statCard(label, value) {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    return div;
  }

  async function render(root) {
    root.innerHTML = '<div class="page-loading">Loading…</div>';

    const [cars, sales] = await Promise.all([Storage.getCars(), Storage.getSales()]);

    const inStock = cars.filter((c) => c.status === 'in_stock');
    const inventoryValue = inStock.reduce((sum, c) => sum + Number(c.purchasePrice || 0), 0);

    const now = new Date();
    const salesThisMonth = sales.filter((s) => {
      const d = new Date(s.saleDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const profitThisMonth = salesThisMonth.reduce(
      (sum, s) => sum + Helpers.saleProfit(s, cars),
      0
    );

    const recentSales = [...sales]
      .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
      .slice(0, 5);

    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'page';

    const h1 = document.createElement('h1');
    h1.textContent = 'Dashboard';
    wrap.appendChild(h1);

    const stats = document.createElement('div');
    stats.className = 'stats-grid';
    stats.appendChild(statCard('Cars in Stock', inStock.length));
    stats.appendChild(statCard('Inventory Value', Helpers.formatCurrency(inventoryValue)));
    stats.appendChild(statCard('Sales This Month', salesThisMonth.length));
    stats.appendChild(statCard('Profit This Month', Helpers.formatCurrency(profitThisMonth)));
    wrap.appendChild(stats);

    const recentTitle = document.createElement('h2');
    recentTitle.textContent = 'Recent Sales';
    wrap.appendChild(recentTitle);

    if (recentSales.length === 0) {
      wrap.appendChild(Helpers.emptyState('No sales recorded yet.'));
    } else {
      const table = document.createElement('table');
      table.className = 'data-table';
      table.innerHTML =
        '<thead><tr><th>Car</th><th>Buyer</th><th>Sale Price</th><th>Date</th><th>Profit</th></tr></thead>';
      const tbody = document.createElement('tbody');
      recentSales.forEach((s) => {
        const car = cars.find((c) => c.id === s.carId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${car ? Helpers.escapeHtml(`${car.year} ${car.make} ${car.model}`) : 'Unknown car'}</td>
          <td>${Helpers.escapeHtml(s.buyerName)}</td>
          <td>${Helpers.formatCurrency(s.salePrice)}</td>
          <td>${Helpers.escapeHtml(s.saleDate)}</td>
          <td>${Helpers.formatCurrency(Helpers.saleProfit(s, cars))}</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
    }

    root.appendChild(wrap);
  }

  window.Views = window.Views || {};
  window.Views.dashboard = { render };
})();
