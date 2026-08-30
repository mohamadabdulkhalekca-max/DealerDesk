/** Dashboard view: always-current stock stats + a selectable-period profit view. */
(function () {
  function statCard(label, value) {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    return div;
  }

  function salesInPeriod(sales, periodType, periodValue) {
    return sales.filter((s) => {
      if (!s.saleDate) return false;
      return periodType === 'month'
        ? s.saleDate.slice(0, 7) === periodValue
        : s.saleDate === periodValue;
    });
  }

  const TREND_MONTHS = 6;

  // Oldest-to-newest month keys ('YYYY-MM') ending with the current month.
  function lastMonthKeys(count) {
    const now = new Date();
    const keys = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  }

  function monthShortLabel(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(I18n.isRtl() ? 'ar' : undefined, {
      month: 'short',
    });
  }

  function renderProfitTrendChart(canvas, sales, cars, parts) {
    const months = lastMonthKeys(TREND_MONTHS);
    const profitByMonth = months.map((m) =>
      salesInPeriod(sales, 'month', m).reduce((sum, s) => sum + Helpers.saleProfit(s, cars, parts), 0)
    );

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map(monthShortLabel),
        datasets: [
          {
            label: I18n.t('dashboard.profitByPeriod'),
            data: profitByMonth,
            backgroundColor: '#1e293b',
            borderRadius: 4,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => Helpers.formatCurrency(ctx.parsed.y),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => Helpers.formatCurrency(value) },
            grid: { color: '#e2e8f0' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function renderInventoryValueChart(canvas, carValue, partsValue) {
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [I18n.t('dashboard.carsValue'), I18n.t('dashboard.partsValue')],
        datasets: [
          {
            data: [carValue, partsValue],
            backgroundColor: ['#1e293b', '#64748b'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Helpers.formatCurrency(ctx.parsed)}`,
            },
          },
        },
      },
    });
  }

  function expensesInPeriod(expenses, periodType, periodValue) {
    return expenses.filter((e) => {
      if (!e.expenseDate) return false;
      return periodType === 'month'
        ? e.expenseDate.slice(0, 7) === periodValue
        : e.expenseDate === periodValue;
    });
  }

  async function render(root) {
    root.innerHTML = '<div class="page-loading">Loading…</div>';

    const [cars, parts, sales, expenses] = await Promise.all([
      Storage.getCars(),
      Storage.getParts(),
      Storage.getSales(),
      Storage.getExpenses(),
    ]);

    const inStock = cars.filter((c) => c.status === 'in_stock');
    const carValue = inStock.reduce(
      (sum, c) => sum + Number(c.purchasePrice || 0) + Number(c.additionalCosts || 0),
      0
    );
    const partsInStockUnits = parts.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const partsValue = parts.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.costPrice || 0), 0);
    const inventoryValue = carValue + partsValue;
    const notSold = cars.filter((c) => c.status !== 'sold');
    const agingCars = notSold
      .map((c) => ({ car: c, days: Helpers.daysInStock(c) }))
      .filter(({ days }) => days !== null && days >= Helpers.AGING_THRESHOLD_DAYS)
      .sort((a, b) => b.days - a.days);
    const lowStockParts = parts
      .filter(Helpers.isLowStock)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity));

    const state = {
      periodType: 'month',
      month: Helpers.currentMonthLocal(),
      day: Helpers.todayLocal(),
    };

    root.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'page';

    const h1 = document.createElement('h1');
    h1.textContent = I18n.t('dashboard.title');
    wrap.appendChild(h1);

    const stats = document.createElement('div');
    stats.className = 'stats-grid';
    stats.appendChild(statCard(I18n.t('dashboard.carsInStock'), inStock.length));
    stats.appendChild(statCard(I18n.t('dashboard.partsInStock'), partsInStockUnits));
    stats.appendChild(statCard(I18n.t('dashboard.inventoryValue'), Helpers.formatCurrency(inventoryValue)));
    stats.appendChild(
      statCard(I18n.t('dashboard.aging', { days: Helpers.AGING_THRESHOLD_DAYS }), agingCars.length)
    );
    stats.appendChild(statCard(I18n.t('dashboard.lowStock'), lowStockParts.length));
    wrap.appendChild(stats);

    const chartRow = document.createElement('div');
    chartRow.className = 'chart-row';

    const trendCol = document.createElement('div');
    trendCol.className = 'chart-col chart-col-wide';
    const chartTitle = document.createElement('h2');
    chartTitle.textContent = I18n.t('dashboard.profitTrend');
    trendCol.appendChild(chartTitle);
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-card';
    const chartCanvas = document.createElement('canvas');
    chartCard.appendChild(chartCanvas);
    trendCol.appendChild(chartCard);
    chartRow.appendChild(trendCol);

    const breakdownCol = document.createElement('div');
    breakdownCol.className = 'chart-col';
    const breakdownTitle = document.createElement('h2');
    breakdownTitle.textContent = I18n.t('dashboard.inventoryBreakdown');
    breakdownCol.appendChild(breakdownTitle);
    const breakdownCard = document.createElement('div');
    breakdownCard.className = 'chart-card';
    const breakdownCanvas = document.createElement('canvas');
    breakdownCard.appendChild(breakdownCanvas);
    breakdownCol.appendChild(breakdownCard);
    chartRow.appendChild(breakdownCol);

    wrap.appendChild(chartRow);

    if (lowStockParts.length > 0) {
      const lowStockTitle = document.createElement('h2');
      lowStockTitle.textContent = I18n.t('dashboard.lowStockParts');
      wrap.appendChild(lowStockTitle);

      const lowStockWrap = document.createElement('div');
      lowStockWrap.className = 'table-wrap';
      const lowStockTable = document.createElement('table');
      lowStockTable.className = 'data-table';
      lowStockTable.innerHTML = `<thead><tr><th>${I18n.t('table.name')}</th><th>${I18n.t('table.category')}</th><th>${I18n.t('table.quantity')}</th></tr></thead>`;
      const lowStockBody = document.createElement('tbody');
      lowStockParts.forEach((p) => {
        const tr = document.createElement('tr');
        const outOfStock = Number(p.quantity) <= 0;
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(p.name)}</td>
          <td><span class="status-badge status-part-${p.category}">${Helpers.partCategoryLabel(p.category)}</span></td>
          <td>${outOfStock ? `<span class="status-badge status-sold">${I18n.t('parts.outOfStock')}</span>` : p.quantity}</td>
        `;
        lowStockBody.appendChild(tr);
      });
      lowStockTable.appendChild(lowStockBody);
      lowStockWrap.appendChild(lowStockTable);
      wrap.appendChild(lowStockWrap);
    }

    if (agingCars.length > 0) {
      const agingTitle = document.createElement('h2');
      agingTitle.textContent = I18n.t('dashboard.agingInventory');
      wrap.appendChild(agingTitle);

      const agingTableWrap = document.createElement('div');
      agingTableWrap.className = 'table-wrap';
      const agingTable = document.createElement('table');
      agingTable.className = 'data-table';
      agingTable.innerHTML = `<thead><tr><th>${I18n.t('table.car')}</th><th>${I18n.t('table.status')}</th><th>${I18n.t('table.daysInStock')}</th><th>${I18n.t('table.purchasePrice')}</th></tr></thead>`;
      const agingBody = document.createElement('tbody');
      agingCars.forEach(({ car, days }) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(`${car.year} ${car.make} ${car.model}`)}</td>
          <td><span class="status-badge status-${car.status}">${Helpers.statusLabel(car.status)}</span></td>
          <td>${I18n.t('dashboard.daysInStockCell', { days })}</td>
          <td>${Helpers.formatCurrency(car.purchasePrice)}</td>
        `;
        agingBody.appendChild(tr);
      });
      agingTable.appendChild(agingBody);
      agingTableWrap.appendChild(agingTable);
      wrap.appendChild(agingTableWrap);
    }

    const profitHeader = document.createElement('div');
    profitHeader.className = 'page-header section-header';
    const profitTitle = document.createElement('h2');
    profitTitle.textContent = I18n.t('dashboard.profitByPeriod');
    profitHeader.appendChild(profitTitle);
    const exportReportBtn = document.createElement('button');
    exportReportBtn.textContent = I18n.t('dashboard.exportReport');
    profitHeader.appendChild(exportReportBtn);
    wrap.appendChild(profitHeader);

    const picker = document.createElement('div');
    picker.className = 'period-picker';

    const toggle = document.createElement('div');
    toggle.className = 'period-toggle';
    const monthBtn = document.createElement('button');
    monthBtn.type = 'button';
    monthBtn.textContent = I18n.t('period.month');
    monthBtn.className = 'active';
    const dayBtn = document.createElement('button');
    dayBtn.type = 'button';
    dayBtn.textContent = I18n.t('period.day');
    toggle.appendChild(monthBtn);
    toggle.appendChild(dayBtn);
    picker.appendChild(toggle);

    const monthPicker = document.createElement('div');
    monthPicker.className = 'month-picker';

    const monthSelect = document.createElement('select');
    Helpers.monthNames().forEach((name, idx) => {
      const o = document.createElement('option');
      o.value = String(idx + 1).padStart(2, '0');
      o.textContent = name;
      monthSelect.appendChild(o);
    });

    const yearSelect = document.createElement('select');
    Helpers.yearOptionsForDates(sales.map((s) => s.saleDate)).forEach((y) => {
      const o = document.createElement('option');
      o.value = String(y);
      o.textContent = String(y);
      yearSelect.appendChild(o);
    });

    const [initYear, initMonth] = state.month.split('-');
    monthSelect.value = initMonth;
    yearSelect.value = initYear;

    monthPicker.appendChild(monthSelect);
    monthPicker.appendChild(yearSelect);
    picker.appendChild(monthPicker);

    const dayInput = document.createElement('input');
    dayInput.type = 'date';
    dayInput.value = state.day;
    dayInput.classList.add('hidden');
    picker.appendChild(dayInput);

    wrap.appendChild(picker);

    const periodStats = document.createElement('div');
    periodStats.className = 'stats-grid';
    wrap.appendChild(periodStats);

    const salesTitle = document.createElement('h2');
    wrap.appendChild(salesTitle);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>${I18n.t('table.items')}</th><th>${I18n.t('table.buyer')}</th><th>${I18n.t('table.total')}</th><th>${I18n.t('table.date')}</th><th>${I18n.t('table.profit')}</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    const emptyWrap = document.createElement('div');
    wrap.appendChild(emptyWrap);

    let currentPeriod = null;

    function refresh() {
      const periodValue = state.periodType === 'month' ? state.month : state.day;
      const periodLabel =
        state.periodType === 'month'
          ? Helpers.formatMonthLabel(state.month)
          : Helpers.formatDayLabel(state.day);
      const periodSales = salesInPeriod(sales, state.periodType, periodValue).sort(
        (a, b) => new Date(b.saleDate) - new Date(a.saleDate)
      );
      const periodExpenses = expensesInPeriod(expenses, state.periodType, periodValue);
      const profit = periodSales.reduce((sum, s) => sum + Helpers.saleProfit(s, cars, parts), 0);
      const expenseTotal = periodExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netProfit = profit - expenseTotal;

      currentPeriod = { periodLabel, periodSales, periodExpenses };

      periodStats.innerHTML = '';
      periodStats.appendChild(statCard(I18n.t('dashboard.salesInPeriod', { period: periodLabel }), periodSales.length));
      periodStats.appendChild(
        statCard(I18n.t('dashboard.profitInPeriod', { period: periodLabel }), Helpers.formatCurrency(profit))
      );
      periodStats.appendChild(statCard(I18n.t('dashboard.expensesInPeriod'), Helpers.formatCurrency(expenseTotal)));
      periodStats.appendChild(statCard(I18n.t('dashboard.netProfitInPeriod'), Helpers.formatCurrency(netProfit)));

      salesTitle.textContent = I18n.t('dashboard.salesInPeriod', { period: periodLabel });

      emptyWrap.innerHTML = '';
      if (periodSales.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(Helpers.emptyState(I18n.t('dashboard.noSalesInPeriod')));
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      periodSales.forEach((s) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(Helpers.saleItemsSummary(s, cars, parts))}</td>
          <td>${Helpers.escapeHtml(s.buyerName)}</td>
          <td>${Helpers.formatCurrency(Helpers.saleTotal(s))}</td>
          <td>${Helpers.escapeHtml(s.saleDate)}</td>
          <td>${Helpers.formatCurrency(Helpers.saleProfit(s, cars, parts))}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    monthBtn.addEventListener('click', () => {
      state.periodType = 'month';
      monthBtn.classList.add('active');
      dayBtn.classList.remove('active');
      monthPicker.classList.remove('hidden');
      dayInput.classList.add('hidden');
      refresh();
    });

    dayBtn.addEventListener('click', () => {
      state.periodType = 'day';
      dayBtn.classList.add('active');
      monthBtn.classList.remove('active');
      dayInput.classList.remove('hidden');
      monthPicker.classList.add('hidden');
      refresh();
    });

    function onMonthPickerChange() {
      state.month = `${yearSelect.value}-${monthSelect.value}`;
      refresh();
    }
    monthSelect.addEventListener('change', onMonthPickerChange);
    yearSelect.addEventListener('change', onMonthPickerChange);

    exportReportBtn.addEventListener('click', async () => {
      if (!currentPeriod) return;
      exportReportBtn.disabled = true;
      try {
        const result = await Report.shareReport(
          currentPeriod.periodLabel,
          currentPeriod.periodSales,
          cars,
          parts,
          currentPeriod.periodExpenses
        );
        if (result.method === 'download') App.showInfo(I18n.t('dashboard.reportDownloaded'));
      } catch (err) {
        App.showError(err.message);
      } finally {
        exportReportBtn.disabled = false;
      }
    });

    dayInput.addEventListener('change', () => {
      if (dayInput.value) {
        state.day = dayInput.value;
        refresh();
      }
    });

    root.appendChild(wrap);
    renderProfitTrendChart(chartCanvas, sales, cars, parts);
    renderInventoryValueChart(breakdownCanvas, carValue, partsValue);
    refresh();
  }

  window.Views = window.Views || {};
  window.Views.dashboard = { render };
})();
