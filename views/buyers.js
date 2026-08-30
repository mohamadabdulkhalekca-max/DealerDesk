/** Buyers view: a lightweight buyer directory derived from sales — no separate buyers table, just grouped by name+contact. */
(function () {
  function buyerKey(sale) {
    return `${(sale.buyerName || '').trim().toLowerCase()}|${(sale.buyerContact || '').trim().toLowerCase()}`;
  }

  function buildBuyers(sales, cars, parts) {
    const byKey = new Map();
    sales.forEach((sale) => {
      const key = buyerKey(sale);
      if (!byKey.has(key)) {
        byKey.set(key, {
          name: sale.buyerName || I18n.t('common.unknownBuyer'),
          contact: sale.buyerContact || '',
          sales: [],
        });
      }
      byKey.get(key).sales.push(sale);
    });

    return Array.from(byKey.values()).map((buyer) => {
      const sorted = [...buyer.sales].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
      const totalSpent = sorted.reduce((sum, s) => sum + Helpers.saleTotal(s), 0);
      const totalProfit = sorted.reduce((sum, s) => sum + Helpers.saleProfit(s, cars, parts), 0);
      return {
        name: buyer.name,
        contact: buyer.contact,
        purchases: sorted.length,
        totalSpent,
        totalProfit,
        lastDate: sorted[0] ? sorted[0].saleDate : null,
        sales: sorted,
      };
    });
  }

  function openHistoryDialog(buyer, cars, parts) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const box = document.createElement('div');
    box.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = buyer.name;
    box.appendChild(h2);

    if (buyer.contact) {
      const contact = document.createElement('p');
      contact.className = 'confirm-message';
      contact.textContent = buyer.contact;
      box.appendChild(contact);
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>${I18n.t('table.date')}</th><th>${I18n.t('table.items')}</th><th>${I18n.t('table.total')}</th><th>${I18n.t('table.profit')}</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    buyer.sales.forEach((s) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Helpers.escapeHtml(s.saleDate)}</td>
        <td>${Helpers.escapeHtml(Helpers.saleItemsSummary(s, cars, parts))}</td>
        <td>${Helpers.formatCurrency(Helpers.saleTotal(s))}</td>
        <td>${Helpers.formatCurrency(Helpers.saleProfit(s, cars, parts))}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    box.appendChild(tableWrap);

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'primary';
    closeBtn.textContent = I18n.t('common.close');
    closeBtn.addEventListener('click', () => dialog.close());
    actions.appendChild(closeBtn);
    box.appendChild(actions);

    dialog.appendChild(box);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }

  async function render(root) {
    const state = { search: '', sort: { key: 'lastDate', dir: -1 } };
    let cars = [];
    let parts = [];
    let buyers = [];

    root.innerHTML = '<div class="page-loading">Loading…</div>';
    const wrap = document.createElement('div');
    wrap.className = 'page';

    const h1 = document.createElement('h1');
    h1.textContent = I18n.t('buyers.title');
    wrap.appendChild(h1);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = I18n.t('buyers.searchPlaceholder');
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      renderRows();
    });
    controls.appendChild(searchInput);
    wrap.appendChild(controls);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const SORT_COLUMNS = [
      ['name', I18n.t('table.buyer')],
      ['purchases', I18n.t('buyers.purchases')],
      ['totalSpent', I18n.t('buyers.totalSpent')],
      ['totalProfit', I18n.t('table.profit')],
      ['lastDate', I18n.t('buyers.lastPurchase')],
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

    const SORT_GETTERS = {
      name: (b) => b.name,
      purchases: (b) => b.purchases,
      totalSpent: (b) => b.totalSpent,
      totalProfit: (b) => b.totalProfit,
      lastDate: (b) => b.lastDate || '',
    };

    function applyFilters() {
      const filtered = buyers.filter((b) => {
        if (state.search) {
          const q = state.search.toLowerCase();
          const hay = `${b.name} ${b.contact}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      if (state.sort.key) {
        const getter = SORT_GETTERS[state.sort.key];
        filtered.sort((a, b) => Helpers.compareValues(getter(a), getter(b)) * state.sort.dir);
      }
      return filtered;
    }

    function renderRows() {
      headRow.querySelectorAll('.th-sort-btn').forEach((btn, idx) => {
        const [key, label] = SORT_COLUMNS[idx];
        const arrow = state.sort.key === key ? (state.sort.dir === 1 ? ' ▲' : ' ▼') : '';
        btn.textContent = label + arrow;
      });

      const filtered = applyFilters();

      emptyWrap.innerHTML = '';
      if (filtered.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(I18n.t(buyers.length === 0 ? 'buyers.noBuyersYet' : 'buyers.noBuyersMatch'))
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      filtered.forEach((b) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(b.name)}</td>
          <td>${b.purchases}</td>
          <td>${Helpers.formatCurrency(b.totalSpent)}</td>
          <td>${Helpers.formatCurrency(b.totalProfit)}</td>
          <td>${b.lastDate ? Helpers.escapeHtml(b.lastDate) : '—'}</td>
          <td class="row-actions"></td>
        `;
        const historyBtn = Helpers.iconButton('receipt', I18n.t('buyers.viewHistory'));
        historyBtn.addEventListener('click', () => openHistoryDialog(b, cars, parts));
        tr.querySelector('.row-actions').appendChild(historyBtn);
        tbody.appendChild(tr);
      });
    }

    try {
      [cars, parts] = await Promise.all([Storage.getCars(), Storage.getParts()]);
      const sales = await Storage.getSales();
      buyers = buildBuyers(sales, cars, parts);
    } catch (err) {
      App.showError(err.message);
    }

    root.innerHTML = '';
    root.appendChild(wrap);
    renderRows();
  }

  window.Views = window.Views || {};
  window.Views.buyers = { render };
})();
