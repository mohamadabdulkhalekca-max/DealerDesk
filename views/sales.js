/** Sales view: sale list with add/edit/delete, linked to inventory cars. */
(function () {
  function carLabel(car) {
    if (!car) return 'Unknown car';
    return `${car.year} ${car.make} ${car.model}`;
  }

  function statCard(label, value) {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    return div;
  }

  function toggleBtn(label, active) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (active) b.classList.add('active');
    return b;
  }

  function populateYearSelect(select, dates, keepYear) {
    const current = keepYear || select.value;
    select.innerHTML = '';
    Helpers.yearOptionsForDates(dates).forEach((y) => {
      const o = document.createElement('option');
      o.value = String(y);
      o.textContent = String(y);
      select.appendChild(o);
    });
    if (current && [...select.options].some((o) => o.value === String(current))) {
      select.value = String(current);
    }
  }

  async function render(root) {
    root.innerHTML = '<div class="page-loading">Loading…</div>';

    let allCars = [];
    let allSales = [];

    const state = {
      periodType: 'all',
      day: Helpers.todayLocal(),
      month: Helpers.currentMonthLocal(),
      rangeStart: `${Helpers.currentMonthLocal()}-01`,
      rangeEnd: Helpers.todayLocal(),
    };

    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Sales';
    header.appendChild(h1);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Sale';
    addBtn.addEventListener('click', () => SaleDialog.open(null, { onSaved: reload }));
    header.appendChild(addBtn);
    wrap.appendChild(header);

    // Period picker
    const picker = document.createElement('div');
    picker.className = 'period-picker';

    const toggle = document.createElement('div');
    toggle.className = 'period-toggle';
    const allBtn = toggleBtn('All', true);
    const dayBtn = toggleBtn('Day');
    const monthBtn = toggleBtn('Month');
    const rangeBtn = toggleBtn('Range');
    [allBtn, dayBtn, monthBtn, rangeBtn].forEach((b) => toggle.appendChild(b));
    picker.appendChild(toggle);

    const dayInput = document.createElement('input');
    dayInput.type = 'date';
    dayInput.value = state.day;
    dayInput.classList.add('hidden');
    picker.appendChild(dayInput);

    const monthPicker = document.createElement('div');
    monthPicker.className = 'month-picker hidden';
    const monthSelect = document.createElement('select');
    Helpers.MONTH_NAMES.forEach((name, idx) => {
      const o = document.createElement('option');
      o.value = String(idx + 1).padStart(2, '0');
      o.textContent = name;
      monthSelect.appendChild(o);
    });
    const yearSelect = document.createElement('select');
    const [initYear, initMonth] = state.month.split('-');
    monthSelect.value = initMonth;
    populateYearSelect(yearSelect, [], initYear);
    monthPicker.appendChild(monthSelect);
    monthPicker.appendChild(yearSelect);
    picker.appendChild(monthPicker);

    const rangePicker = document.createElement('div');
    rangePicker.className = 'range-picker hidden';
    const rangeStartInput = document.createElement('input');
    rangeStartInput.type = 'date';
    rangeStartInput.value = state.rangeStart;
    const rangeToLabel = document.createElement('span');
    rangeToLabel.className = 'period-label';
    rangeToLabel.textContent = 'to';
    const rangeEndInput = document.createElement('input');
    rangeEndInput.type = 'date';
    rangeEndInput.value = state.rangeEnd;
    rangePicker.appendChild(rangeStartInput);
    rangePicker.appendChild(rangeToLabel);
    rangePicker.appendChild(rangeEndInput);
    picker.appendChild(rangePicker);

    wrap.appendChild(picker);

    const periodStats = document.createElement('div');
    periodStats.className = 'stats-grid';
    wrap.appendChild(periodStats);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
      <thead>
        <tr><th>Car</th><th>Buyer</th><th>Sale Price</th><th>Profit</th><th>Date</th><th>Payment</th><th></th></tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    const emptyWrap = document.createElement('div');
    wrap.appendChild(emptyWrap);

    function periodLabel() {
      if (state.periodType === 'all') return 'All Time';
      if (state.periodType === 'day') return Helpers.formatDayLabel(state.day);
      if (state.periodType === 'month') return Helpers.formatMonthLabel(state.month);
      return `${state.rangeStart} to ${state.rangeEnd}`;
    }

    function filterByPeriod(sales) {
      return sales.filter((s) => {
        if (state.periodType === 'all') return true;
        if (!s.saleDate) return false;
        if (state.periodType === 'day') return s.saleDate === state.day;
        if (state.periodType === 'month') return s.saleDate.slice(0, 7) === state.month;
        return s.saleDate >= state.rangeStart && s.saleDate <= state.rangeEnd;
      });
    }

    function setPeriodType(type) {
      state.periodType = type;
      allBtn.classList.toggle('active', type === 'all');
      dayBtn.classList.toggle('active', type === 'day');
      monthBtn.classList.toggle('active', type === 'month');
      rangeBtn.classList.toggle('active', type === 'range');
      dayInput.classList.toggle('hidden', type !== 'day');
      monthPicker.classList.toggle('hidden', type !== 'month');
      rangePicker.classList.toggle('hidden', type !== 'range');
      renderRows();
    }

    allBtn.addEventListener('click', () => setPeriodType('all'));
    dayBtn.addEventListener('click', () => setPeriodType('day'));
    monthBtn.addEventListener('click', () => setPeriodType('month'));
    rangeBtn.addEventListener('click', () => setPeriodType('range'));

    dayInput.addEventListener('change', () => {
      if (dayInput.value) {
        state.day = dayInput.value;
        renderRows();
      }
    });

    function onMonthPickerChange() {
      state.month = `${yearSelect.value}-${monthSelect.value}`;
      renderRows();
    }
    monthSelect.addEventListener('change', onMonthPickerChange);
    yearSelect.addEventListener('change', onMonthPickerChange);

    rangeStartInput.addEventListener('change', () => {
      if (rangeStartInput.value) {
        state.rangeStart = rangeStartInput.value;
        renderRows();
      }
    });
    rangeEndInput.addEventListener('change', () => {
      if (rangeEndInput.value) {
        state.rangeEnd = rangeEndInput.value;
        renderRows();
      }
    });

    function renderRows() {
      const filtered = filterByPeriod(allSales).sort(
        (a, b) => new Date(b.saleDate) - new Date(a.saleDate)
      );
      const profit = filtered.reduce((sum, s) => sum + Helpers.saleProfit(s, allCars), 0);
      const label = periodLabel();

      periodStats.innerHTML = '';
      periodStats.appendChild(statCard(`Sales — ${label}`, filtered.length));
      periodStats.appendChild(statCard(`Profit — ${label}`, Helpers.formatCurrency(profit)));

      emptyWrap.innerHTML = '';
      if (filtered.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(
            allSales.length === 0 ? 'No sales recorded yet.' : 'No sales in this period.'
          )
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      filtered.forEach((s) => {
        const car = allCars.find((c) => c.id === s.carId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(carLabel(car))}</td>
          <td>${Helpers.escapeHtml(s.buyerName)}</td>
          <td>${Helpers.formatCurrency(s.salePrice)}</td>
          <td>${Helpers.formatCurrency(Helpers.saleProfit(s, allCars))}</td>
          <td>${Helpers.escapeHtml(s.saleDate)}</td>
          <td><span class="status-badge status-${s.paymentStatus}">${s.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span></td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
        const receiptBtn = document.createElement('button');
        receiptBtn.textContent = 'Receipt';
        receiptBtn.addEventListener('click', async () => {
          receiptBtn.disabled = true;
          try {
            const result = await Receipt.shareReceipt(s, car);
            if (result.method === 'download') {
              App.showInfo('Sharing isn’t available on this browser — the receipt PDF was downloaded instead.');
            }
          } catch (err) {
            App.showError(err.message);
          } finally {
            receiptBtn.disabled = false;
          }
        });
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => SaleDialog.open(s, { onSaved: reload }));
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
          if (!confirm(`Delete this sale to ${s.buyerName}?`)) return;
          try {
            await Storage.deleteSale(s.id);
            await reload();
          } catch (err) {
            App.showError(err.message);
          }
        });
        actionsCell.appendChild(receiptBtn);
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        tbody.appendChild(tr);
      });
    }

    async function reload() {
      try {
        [allCars, allSales] = await Promise.all([Storage.getCars(), Storage.getSales()]);
      } catch (err) {
        App.showError(err.message);
        return;
      }
      populateYearSelect(yearSelect, allSales.map((s) => s.saleDate), yearSelect.value);
      renderRows();
    }

    root.innerHTML = '';
    root.appendChild(wrap);
    await reload();
  }

  window.Views = window.Views || {};
  window.Views.sales = { render };
})();
