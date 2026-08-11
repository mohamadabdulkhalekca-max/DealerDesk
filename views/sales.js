/** Sales view: sale list with add/edit/delete, linked to inventory cars. */
(function () {
  function carLabel(car) {
    if (!car) return 'Unknown car';
    return `${car.year} ${car.make} ${car.model}`;
  }

  function availableCarsFor(cars, sale) {
    return cars.filter((c) => c.status !== 'sold' || (sale && sale.carId === c.id));
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

  async function openSaleDialog(sale, onSaved) {
    let cars;
    try {
      cars = await Storage.getCars();
    } catch (err) {
      App.showError(err.message);
      return;
    }
    const choices = availableCarsFor(cars, sale);

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = sale ? 'Edit Sale' : 'Add Sale';
    form.appendChild(h2);

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';

    if (!sale && choices.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'No cars available to sell — every car is already sold.';
      form.appendChild(msg);
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', () => dialog.close());
      form.appendChild(closeBtn);
      dialog.appendChild(form);
      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => dialog.remove());
      dialog.showModal();
      return;
    }

    const carLabelEl = document.createElement('label');
    carLabelEl.className = 'form-field';
    carLabelEl.textContent = 'Car *';
    const carSelect = document.createElement('select');
    carSelect.name = 'carId';
    carSelect.required = true;
    choices.forEach((c) => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${carLabel(c)} (${Helpers.statusLabel(c.status)})`;
      carSelect.appendChild(o);
    });
    if (sale) carSelect.value = sale.carId;
    carLabelEl.appendChild(carSelect);
    form.appendChild(carLabelEl);

    const buyerNameLabel = document.createElement('label');
    buyerNameLabel.className = 'form-field';
    buyerNameLabel.textContent = 'Buyer Name *';
    const buyerNameInput = document.createElement('input');
    buyerNameInput.name = 'buyerName';
    buyerNameInput.required = true;
    if (sale) buyerNameInput.value = sale.buyerName;
    buyerNameLabel.appendChild(buyerNameInput);
    form.appendChild(buyerNameLabel);

    const buyerContactLabel = document.createElement('label');
    buyerContactLabel.className = 'form-field';
    buyerContactLabel.textContent = 'Buyer Contact';
    const buyerContactInput = document.createElement('input');
    buyerContactInput.name = 'buyerContact';
    if (sale) buyerContactInput.value = sale.buyerContact || '';
    buyerContactLabel.appendChild(buyerContactInput);
    form.appendChild(buyerContactLabel);

    const salePriceLabel = document.createElement('label');
    salePriceLabel.className = 'form-field';
    salePriceLabel.textContent = 'Sale Price *';
    const salePriceInput = document.createElement('input');
    salePriceInput.type = 'number';
    salePriceInput.name = 'salePrice';
    salePriceInput.required = true;
    if (sale) salePriceInput.value = sale.salePrice;
    salePriceLabel.appendChild(salePriceInput);
    form.appendChild(salePriceLabel);

    const saleDateLabel = document.createElement('label');
    saleDateLabel.className = 'form-field';
    saleDateLabel.textContent = 'Sale Date';
    const saleDateInput = document.createElement('input');
    saleDateInput.type = 'date';
    saleDateInput.name = 'saleDate';
    saleDateInput.value = sale ? sale.saleDate : new Date().toISOString().slice(0, 10);
    saleDateLabel.appendChild(saleDateInput);
    form.appendChild(saleDateLabel);

    const paymentLabel = document.createElement('label');
    paymentLabel.className = 'form-field';
    paymentLabel.textContent = 'Payment Status';
    const paymentSelect = document.createElement('select');
    paymentSelect.name = 'paymentStatus';
    [
      { value: 'paid', label: 'Paid' },
      { value: 'pending', label: 'Pending' },
    ].forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      paymentSelect.appendChild(o);
    });
    paymentSelect.value = sale ? sale.paymentStatus : 'paid';
    paymentLabel.appendChild(paymentSelect);
    form.appendChild(paymentLabel);

    const notesLabel = document.createElement('label');
    notesLabel.className = 'form-field';
    notesLabel.textContent = 'Notes';
    const notesInput = document.createElement('textarea');
    notesInput.name = 'notes';
    if (sale) notesInput.value = sale.notes || '';
    notesLabel.appendChild(notesInput);
    form.appendChild(notesLabel);

    form.appendChild(errorMsg);

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dialog.close());
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'primary';
    saveBtn.textContent = 'Save';
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.add('hidden');

      const buyerName = buyerNameInput.value.trim();
      const salePrice = salePriceInput.value;
      if (!buyerName) {
        errorMsg.textContent = 'Buyer Name is required.';
        errorMsg.classList.remove('hidden');
        buyerNameInput.focus();
        return;
      }
      if (salePrice === '' || Number(salePrice) <= 0) {
        errorMsg.textContent = 'Sale Price must be a positive number.';
        errorMsg.classList.remove('hidden');
        salePriceInput.focus();
        return;
      }

      const data = {
        ...(sale || {}),
        carId: carSelect.value,
        buyerName,
        buyerContact: buyerContactInput.value.trim(),
        salePrice: Number(salePrice),
        saleDate: saleDateInput.value,
        paymentStatus: paymentSelect.value,
        notes: notesInput.value.trim(),
      };

      saveBtn.disabled = true;
      try {
        await Storage.saveSale(data);
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = false;
        return;
      }
      dialog.close();
      dialog.remove();
      onSaved();
    });

    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
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
    addBtn.addEventListener('click', () => openSaleDialog(null, reload));
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
        editBtn.addEventListener('click', () => openSaleDialog(s, reload));
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
