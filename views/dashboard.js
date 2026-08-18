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

  async function render(root) {
    root.innerHTML = '<div class="page-loading">Loading…</div>';

    const [cars, parts, sales] = await Promise.all([
      Storage.getCars(),
      Storage.getParts(),
      Storage.getSales(),
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
    wrap.appendChild(stats);

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

    const profitTitle = document.createElement('h2');
    profitTitle.textContent = I18n.t('dashboard.profitByPeriod');
    wrap.appendChild(profitTitle);

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

    function refresh() {
      const periodValue = state.periodType === 'month' ? state.month : state.day;
      const periodLabel =
        state.periodType === 'month'
          ? Helpers.formatMonthLabel(state.month)
          : Helpers.formatDayLabel(state.day);
      const periodSales = salesInPeriod(sales, state.periodType, periodValue).sort(
        (a, b) => new Date(b.saleDate) - new Date(a.saleDate)
      );
      const profit = periodSales.reduce((sum, s) => sum + Helpers.saleProfit(s, cars, parts), 0);

      periodStats.innerHTML = '';
      periodStats.appendChild(statCard(I18n.t('dashboard.salesInPeriod', { period: periodLabel }), periodSales.length));
      periodStats.appendChild(
        statCard(I18n.t('dashboard.profitInPeriod', { period: periodLabel }), Helpers.formatCurrency(profit))
      );

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

    dayInput.addEventListener('change', () => {
      if (dayInput.value) {
        state.day = dayInput.value;
        refresh();
      }
    });

    root.appendChild(wrap);
    refresh();
  }

  window.Views = window.Views || {};
  window.Views.dashboard = { render };
})();
