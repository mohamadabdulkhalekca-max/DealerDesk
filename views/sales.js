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
      search: '',
      periodType: 'all',
      day: Helpers.todayLocal(),
      month: Helpers.currentMonthLocal(),
      rangeStart: `${Helpers.currentMonthLocal()}-01`,
      rangeEnd: Helpers.todayLocal(),
      sort: { key: 'saleDate', dir: -1 },
      page: 1,
    };

    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Sales';
    header.appendChild(h1);

    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export CSV';
    exportBtn.addEventListener('click', () => {
      const rows = allSales.map((s) => {
        const car = allCars.find((c) => c.id === s.carId);
        return {
          car: carLabel(car),
          buyerName: s.buyerName,
          buyerContact: s.buyerContact,
          salePrice: s.salePrice,
          profit: Helpers.saleProfit(s, allCars),
          saleDate: s.saleDate,
          paymentStatus: s.paymentStatus,
          notes: s.notes,
        };
      });
      const columns = [
        { key: 'car', label: 'Car' },
        { key: 'buyerName', label: 'Buyer Name' },
        { key: 'buyerContact', label: 'Buyer Contact' },
        { key: 'salePrice', label: 'Sale Price' },
        { key: 'profit', label: 'Profit' },
        { key: 'saleDate', label: 'Sale Date' },
        { key: 'paymentStatus', label: 'Payment Status' },
        { key: 'notes', label: 'Notes' },
      ];
      Helpers.downloadCsv(`sales-${Helpers.todayLocal()}.csv`, Helpers.toCsv(rows, columns));
    });
    headerActions.appendChild(exportBtn);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Sale';
    addBtn.addEventListener('click', () => SaleDialog.open(null, { onSaved: reload }));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search buyer or car…';
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      state.page = 1;
      renderRows();
    });
    toolbar.appendChild(searchInput);
    wrap.appendChild(toolbar);

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
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const SORT_COLUMNS = [
      ['car', 'Car'],
      ['buyerName', 'Buyer'],
      ['salePrice', 'Sale Price'],
      ['profit', 'Profit'],
      ['saleDate', 'Date'],
      ['paymentStatus', 'Payment'],
    ];
    SORT_COLUMNS.forEach(([key, label]) => {
      headRow.appendChild(
        Helpers.sortableHeader(label, key, state.sort, (clickedKey) => {
          if (state.sort.key === clickedKey) {
            state.sort.dir *= -1;
          } else {
            state.sort = { key: clickedKey, dir: 1 };
          }
          renderRows();
        })
      );
    });
    headRow.appendChild(document.createElement('th'));
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    const emptyWrap = document.createElement('div');
    wrap.appendChild(emptyWrap);

    const pagination = document.createElement('div');
    pagination.className = 'pagination hidden';
    wrap.appendChild(pagination);

    const SORT_GETTERS = {
      car: (s) => carLabel(allCars.find((c) => c.id === s.carId)),
      buyerName: (s) => s.buyerName || '',
      salePrice: (s) => Number(s.salePrice) || 0,
      profit: (s) => Helpers.saleProfit(s, allCars),
      saleDate: (s) => s.saleDate || '',
      paymentStatus: (s) => s.paymentStatus || '',
    };
    const PAGE_SIZE = 20;

    function periodLabel() {
      if (state.periodType === 'all') return 'All Time';
      if (state.periodType === 'day') return Helpers.formatDayLabel(state.day);
      if (state.periodType === 'month') return Helpers.formatMonthLabel(state.month);
      return `${state.rangeStart} to ${state.rangeEnd}`;
    }

    function applyFilters(sales) {
      return sales.filter((s) => {
        if (state.periodType !== 'all') {
          if (!s.saleDate) return false;
          if (state.periodType === 'day' && s.saleDate !== state.day) return false;
          if (state.periodType === 'month' && s.saleDate.slice(0, 7) !== state.month) return false;
          if (
            state.periodType === 'range' &&
            !(s.saleDate >= state.rangeStart && s.saleDate <= state.rangeEnd)
          ) {
            return false;
          }
        }
        if (state.search) {
          const car = allCars.find((c) => c.id === s.carId);
          const q = state.search.toLowerCase();
          const hay = `${s.buyerName} ${carLabel(car)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function setPeriodType(type) {
      state.periodType = type;
      state.page = 1;
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
        state.page = 1;
        renderRows();
      }
    });

    function onMonthPickerChange() {
      state.month = `${yearSelect.value}-${monthSelect.value}`;
      state.page = 1;
      renderRows();
    }
    monthSelect.addEventListener('change', onMonthPickerChange);
    yearSelect.addEventListener('change', onMonthPickerChange);

    rangeStartInput.addEventListener('change', () => {
      if (rangeStartInput.value) {
        state.rangeStart = rangeStartInput.value;
        state.page = 1;
        renderRows();
      }
    });
    rangeEndInput.addEventListener('change', () => {
      if (rangeEndInput.value) {
        state.rangeEnd = rangeEndInput.value;
        state.page = 1;
        renderRows();
      }
    });

    function renderRows() {
      headRow.querySelectorAll('.th-sort-btn').forEach((btn, idx) => {
        const [key, label] = SORT_COLUMNS[idx];
        const arrow = state.sort.key === key ? (state.sort.dir === 1 ? ' ▲' : ' ▼') : '';
        btn.textContent = label + arrow;
      });

      const filtered = applyFilters(allSales);
      const getter = SORT_GETTERS[state.sort.key];
      filtered.sort((a, b) => Helpers.compareValues(getter(a), getter(b)) * state.sort.dir);

      const profit = filtered.reduce((sum, s) => sum + Helpers.saleProfit(s, allCars), 0);
      const label = periodLabel();

      periodStats.innerHTML = '';
      periodStats.appendChild(statCard(`Sales — ${label}`, filtered.length));
      periodStats.appendChild(statCard(`Profit — ${label}`, Helpers.formatCurrency(profit)));

      emptyWrap.innerHTML = '';
      if (filtered.length === 0) {
        tableWrap.classList.add('hidden');
        pagination.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(
            allSales.length === 0
              ? 'No sales recorded yet.'
              : state.search
              ? 'No sales match your search.'
              : 'No sales in this period.'
          )
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      const pageStart = (state.page - 1) * PAGE_SIZE;
      const pageSales = filtered.slice(pageStart, pageStart + PAGE_SIZE);

      pagination.innerHTML = '';
      if (totalPages > 1) {
        pagination.classList.remove('hidden');
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = state.page === 1;
        prevBtn.addEventListener('click', () => {
          state.page -= 1;
          renderRows();
        });
        const pageLabel = document.createElement('span');
        pageLabel.textContent = `Page ${state.page} of ${totalPages}`;
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = state.page === totalPages;
        nextBtn.addEventListener('click', () => {
          state.page += 1;
          renderRows();
        });
        pagination.appendChild(prevBtn);
        pagination.appendChild(pageLabel);
        pagination.appendChild(nextBtn);
      } else {
        pagination.classList.add('hidden');
      }

      tbody.innerHTML = '';
      pageSales.forEach((s) => {
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
        const receiptBtn = Helpers.iconButton('receipt', 'Receipt');
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
        const editBtn = Helpers.iconButton('edit', 'Edit');
        editBtn.addEventListener('click', () => SaleDialog.open(s, { onSaved: reload }));
        const deleteBtn = Helpers.iconButton('delete', 'Delete', 'danger');
        deleteBtn.addEventListener('click', async () => {
          const ok = await ConfirmDialog.open({
            title: 'Delete sale?',
            message: `Delete this sale to ${s.buyerName}? This can't be undone.`,
          });
          if (!ok) return;
          try {
            await Storage.deleteSale(s.id);
            App.showToast('Sale deleted');
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
