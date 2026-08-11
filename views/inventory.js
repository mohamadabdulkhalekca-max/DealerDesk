/** Inventory view: car list with search/filter, add/edit/delete. */
(function () {
  const FIELDS = [
    { key: 'make', label: 'Make', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'number', required: true },
    { key: 'vin', label: 'VIN', type: 'text', required: false },
    { key: 'color', label: 'Color', type: 'text', required: false },
    { key: 'mileage', label: 'Mileage', type: 'number', required: false },
    { key: 'purchasePrice', label: 'Purchase Price', type: 'number', required: true },
    { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: false },
    { key: 'status', label: 'Status', type: 'select', required: false,
      options: [
        { value: 'in_stock', label: 'In Stock' },
        { value: 'reserved', label: 'Reserved' },
        { value: 'sold', label: 'Sold' },
      ] },
    { key: 'notes', label: 'Notes', type: 'textarea', required: false },
  ];

  function buildFormField(field, car) {
    const wrap = document.createElement('label');
    wrap.className = 'form-field';
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
    if (car && car[field.key] != null) input.value = car[field.key];
    else if (field.key === 'status') input.value = 'in_stock';

    wrap.appendChild(input);
    return wrap;
  }

  function buildPhotoField(car) {
    const state = { file: null, removed: false };

    const wrap = document.createElement('div');
    wrap.className = 'photo-field';

    const preview = document.createElement('img');
    preview.className = 'photo-preview';
    preview.alt = 'Car photo';
    if (car && car.photoUrl) {
      preview.src = car.photoUrl;
    } else {
      preview.classList.add('hidden');
    }
    wrap.appendChild(preview);

    const controls = document.createElement('div');
    controls.className = 'photo-controls';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    controls.appendChild(fileInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove Photo';
    if (!(car && car.photoUrl)) removeBtn.classList.add('hidden');
    controls.appendChild(removeBtn);

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      state.file = file;
      state.removed = false;
      preview.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
      removeBtn.classList.remove('hidden');
    });

    removeBtn.addEventListener('click', () => {
      state.file = null;
      state.removed = true;
      fileInput.value = '';
      preview.removeAttribute('src');
      preview.classList.add('hidden');
      removeBtn.classList.add('hidden');
    });

    wrap.appendChild(controls);
    return { element: wrap, state };
  }

  function openCarDialog(car, onSaved) {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = car ? 'Edit Car' : 'Add Car';
    form.appendChild(h2);

    const photo = buildPhotoField(car);
    form.appendChild(photo.element);

    FIELDS.forEach((field) => form.appendChild(buildFormField(field, car)));

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
      const data = car ? { ...car } : {};
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
      if (!data.status) data.status = 'in_stock';

      saveBtn.disabled = true;
      if (photo.state.file) {
        try {
          data.photoUrl = await Storage.uploadCarPhoto(photo.state.file);
        } catch (err) {
          errorMsg.textContent = err.message;
          errorMsg.classList.remove('hidden');
          saveBtn.disabled = false;
          return;
        }
      } else if (photo.state.removed) {
        data.photoUrl = null;
      }

      try {
        await Storage.saveCar(data);
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
    const state = { filter: 'all', search: '' };
    let allCars = [];

    root.innerHTML = '<div class="page-loading">Loading…</div>';
    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Inventory';
    header.appendChild(h1);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Car';
    addBtn.addEventListener('click', () => openCarDialog(null, reload));
    header.appendChild(addBtn);
    wrap.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search make, model, VIN…';
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      renderRows();
    });
    controls.appendChild(searchInput);

    const filterSelect = document.createElement('select');
    [
      { value: 'all', label: 'All statuses' },
      { value: 'in_stock', label: 'In Stock' },
      { value: 'reserved', label: 'Reserved' },
      { value: 'sold', label: 'Sold' },
    ].forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      filterSelect.appendChild(o);
    });
    filterSelect.addEventListener('change', () => {
      state.filter = filterSelect.value;
      renderRows();
    });
    controls.appendChild(filterSelect);
    wrap.appendChild(controls);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
      <thead>
        <tr><th></th><th>Make</th><th>Model</th><th>Year</th><th>Status</th><th>Purchase Price</th><th>Mileage</th><th></th></tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    const emptyWrap = document.createElement('div');
    wrap.appendChild(emptyWrap);

    function applyFilters() {
      return allCars.filter((c) => {
        if (state.filter !== 'all' && c.status !== state.filter) return false;
        if (state.search) {
          const q = state.search.toLowerCase();
          const hay = `${c.make} ${c.model} ${c.vin || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function renderRows() {
      const cars = applyFilters();

      emptyWrap.innerHTML = '';
      if (cars.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(
            allCars.length === 0
              ? 'No cars yet — add your first one.'
              : 'No cars match your search/filter.'
          )
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      cars.forEach((c) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${
            c.photoUrl
              ? `<img class="table-thumb" alt="" src="${Helpers.escapeHtml(c.photoUrl)}">`
              : '<div class="table-thumb table-thumb-empty"></div>'
          }</td>
          <td>${Helpers.escapeHtml(c.make)}</td>
          <td>${Helpers.escapeHtml(c.model)}</td>
          <td>${Helpers.escapeHtml(c.year)}</td>
          <td><span class="status-badge status-${c.status}">${Helpers.statusLabel(c.status)}</span></td>
          <td>${Helpers.formatCurrency(c.purchasePrice)}</td>
          <td>${c.mileage ? Number(c.mileage).toLocaleString() : '—'}</td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
        if (c.status !== 'sold') {
          const sellBtn = document.createElement('button');
          sellBtn.textContent = 'Sell';
          sellBtn.addEventListener('click', () =>
            SaleDialog.open(null, { onSaved: reload, presetCarId: c.id })
          );
          actionsCell.appendChild(sellBtn);
        }
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openCarDialog(c, reload));
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
          if (!confirm(`Delete ${c.year} ${c.make} ${c.model}?`)) return;
          try {
            await Storage.deleteCar(c.id);
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
        allCars = await Storage.getCars();
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
  window.Views.inventory = { render };
})();
