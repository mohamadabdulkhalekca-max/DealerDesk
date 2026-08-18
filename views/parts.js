/** Parts view: auto parts/oils/tires inventory — quantity-based, unlike cars. */
(function () {
  const CATEGORY_OPTIONS = [
    { value: 'oil', label: 'Oil' },
    { value: 'tire', label: 'Tire' },
    { value: 'part', label: 'Part' },
    { value: 'other', label: 'Other' },
  ];

  const FIELDS = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'select', required: false, options: CATEGORY_OPTIONS },
    { key: 'sku', label: 'SKU', type: 'text', required: false },
    { key: 'quantity', label: 'Quantity in Stock', type: 'number', required: true },
    { key: 'costPrice', label: 'Cost Price (per unit)', type: 'number', required: true },
    { key: 'askingPrice', label: 'Asking Price (per unit)', type: 'number', required: false },
    { key: 'notes', label: 'Notes', type: 'textarea', required: false, wide: true },
  ];

  function buildFormField(field, part) {
    const wrap = document.createElement('label');
    wrap.className = field.wide ? 'form-field form-field-wide' : 'form-field';
    wrap.textContent = field.label + (field.required ? ' *' : '');

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        input.appendChild(o);
      });
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = field.type;
    }
    input.name = field.key;
    if (field.required) input.required = true;
    if (part && part[field.key] != null) input.value = part[field.key];
    else if (field.key === 'category') input.value = 'part';
    else if (field.key === 'quantity') input.value = 0;

    wrap.appendChild(input);
    return wrap;
  }

  function openPartDialog(part, onSaved) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = part ? 'Edit Part' : 'Add Part';
    form.appendChild(h2);

    FIELDS.forEach((field) => form.appendChild(buildFormField(field, part)));

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';
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
      const data = part ? { ...part } : {};
      for (const field of FIELDS) {
        const input = form.elements[field.key];
        let value = input.value;
        if (field.type === 'number') value = value === '' ? '' : Number(value);
        if (field.required && (value === '' || value == null)) {
          errorMsg.textContent = `${field.label} is required.`;
          errorMsg.classList.remove('hidden');
          input.focus();
          return;
        }
        data[field.key] = value;
      }
      if (!data.category) data.category = 'part';

      saveBtn.disabled = true;
      try {
        await Storage.savePart(data);
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = false;
        return;
      }
      App.showToast(part ? 'Part updated' : 'Part added');
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
    const state = { category: 'all', search: '', sort: { key: null, dir: 1 }, page: 1 };
    let allParts = [];

    root.innerHTML = '<div class="page-loading">Loading…</div>';
    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Parts';
    header.appendChild(h1);

    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export CSV';
    exportBtn.addEventListener('click', () => {
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'sku', label: 'SKU' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'costPrice', label: 'Cost Price' },
        { key: 'askingPrice', label: 'Asking Price' },
        { key: 'notes', label: 'Notes' },
      ];
      Helpers.downloadCsv(`parts-${Helpers.todayLocal()}.csv`, Helpers.toCsv(allParts, columns));
    });
    headerActions.appendChild(exportBtn);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Part';
    addBtn.addEventListener('click', () => openPartDialog(null, reload));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search name, SKU…';
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      state.page = 1;
      renderRows();
    });
    controls.appendChild(searchInput);

    const categorySelect = document.createElement('select');
    [{ value: 'all', label: 'All categories' }, ...CATEGORY_OPTIONS].forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      categorySelect.appendChild(o);
    });
    categorySelect.addEventListener('change', () => {
      state.category = categorySelect.value;
      state.page = 1;
      renderRows();
    });
    controls.appendChild(categorySelect);
    wrap.appendChild(controls);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const SORT_COLUMNS = [
      ['name', 'Name'],
      ['category', 'Category'],
      ['sku', 'SKU'],
      ['quantity', 'Quantity'],
      ['costPrice', 'Cost Price'],
      ['askingPrice', 'Asking Price'],
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
      name: (p) => p.name || '',
      category: (p) => Helpers.partCategoryLabel(p.category),
      sku: (p) => p.sku || '',
      quantity: (p) => Number(p.quantity) || 0,
      costPrice: (p) => Number(p.costPrice) || 0,
      askingPrice: (p) => Number(p.askingPrice) || 0,
    };
    const PAGE_SIZE = 20;

    function applyFilters() {
      const filtered = allParts.filter((p) => {
        if (state.category !== 'all' && p.category !== state.category) return false;
        if (state.search) {
          const q = state.search.toLowerCase();
          const hay = `${p.name} ${p.sku || ''}`.toLowerCase();
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
        pagination.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(
            allParts.length === 0
              ? 'No parts yet — add your first one.'
              : 'No parts match your search/filter.'
          )
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      const pageStart = (state.page - 1) * PAGE_SIZE;
      const parts = filtered.slice(pageStart, pageStart + PAGE_SIZE);

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
        const label = document.createElement('span');
        label.textContent = `Page ${state.page} of ${totalPages}`;
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = state.page === totalPages;
        nextBtn.addEventListener('click', () => {
          state.page += 1;
          renderRows();
        });
        pagination.appendChild(prevBtn);
        pagination.appendChild(label);
        pagination.appendChild(nextBtn);
      } else {
        pagination.classList.add('hidden');
      }

      tbody.innerHTML = '';
      parts.forEach((p) => {
        const outOfStock = Number(p.quantity) <= 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(p.name)}</td>
          <td><span class="status-badge status-part-${p.category}">${Helpers.partCategoryLabel(p.category)}</span></td>
          <td>${p.sku ? Helpers.escapeHtml(p.sku) : '—'}</td>
          <td>${outOfStock ? '<span class="status-badge status-sold">Out of stock</span>' : p.quantity}</td>
          <td>${Helpers.formatCurrency(p.costPrice)}</td>
          <td>${p.askingPrice != null ? Helpers.formatCurrency(p.askingPrice) : '—'}</td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
        if (!outOfStock) {
          const sellBtn = Helpers.iconButton('sell', 'Sell');
          sellBtn.addEventListener('click', () =>
            SaleDialog.open(null, { onSaved: reload, presetPartId: p.id })
          );
          actionsCell.appendChild(sellBtn);
        }
        const editBtn = Helpers.iconButton('edit', 'Edit');
        editBtn.addEventListener('click', () => openPartDialog(p, reload));
        const deleteBtn = Helpers.iconButton('delete', 'Delete', 'danger');
        deleteBtn.addEventListener('click', async () => {
          const ok = await ConfirmDialog.open({
            title: 'Delete part?',
            message: `Delete ${p.name}? This can't be undone.`,
          });
          if (!ok) return;
          try {
            await Storage.deletePart(p.id);
            App.showToast('Part deleted');
            await reload();
          } catch (err) {
            App.showError(err.message);
          }
        });
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        tbody.appendChild(tr);
      });
    }

    async function reload() {
      try {
        allParts = await Storage.getParts();
        renderRows();
      } catch (err) {
        App.showError(err.message);
      }
    }

    root.innerHTML = '';
    root.appendChild(wrap);
    await reload();
  }

  window.Views = window.Views || {};
  window.Views.parts = { render };
})();
