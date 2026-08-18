/** Inventory view: car list with search/filter, add/edit/delete. */
(function () {
  function openPhotoViewer(urls, startIndex) {
    let index = startIndex;

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog photo-viewer-dialog';

    const content = document.createElement('div');
    content.className = 'photo-viewer';

    const img = document.createElement('img');
    img.className = 'photo-viewer-img';
    img.alt = '';
    content.appendChild(img);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'photo-viewer-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', I18n.t('common.close'));
    closeBtn.addEventListener('click', () => dialog.close());
    content.appendChild(closeBtn);

    let counter = null;
    function show(i) {
      index = (i + urls.length) % urls.length;
      img.src = urls[index];
      if (counter) counter.textContent = `${index + 1} / ${urls.length}`;
    }

    if (urls.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'photo-viewer-nav photo-viewer-prev';
      prevBtn.textContent = '‹';
      prevBtn.setAttribute('aria-label', I18n.t('photoViewer.previousPhoto'));
      prevBtn.addEventListener('click', () => show(index - 1));
      content.appendChild(prevBtn);

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'photo-viewer-nav photo-viewer-next';
      nextBtn.textContent = '›';
      nextBtn.setAttribute('aria-label', I18n.t('photoViewer.nextPhoto'));
      nextBtn.addEventListener('click', () => show(index + 1));
      content.appendChild(nextBtn);

      counter = document.createElement('div');
      counter.className = 'photo-viewer-counter';
      content.appendChild(counter);

      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') show(index - 1);
        else if (e.key === 'ArrowRight') show(index + 1);
      });
    }

    dialog.appendChild(content);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
    show(startIndex);
  }

  function buildFields() {
    return [
      { key: 'make', labelKey: 'field.make', type: 'text', required: true },
      { key: 'model', labelKey: 'field.model', type: 'text', required: true },
      { key: 'year', labelKey: 'field.year', type: 'number', required: true },
      { key: 'vin', labelKey: 'field.vin', type: 'text' },
      { key: 'color', labelKey: 'field.color', type: 'text' },
      { key: 'mileage', labelKey: 'field.mileage', type: 'number' },
      { key: 'purchasePrice', labelKey: 'field.purchasePrice', type: 'number', required: true },
      { key: 'additionalCosts', labelKey: 'field.additionalCosts', type: 'number' },
      { key: 'askingPrice', labelKey: 'field.askingPrice', type: 'number' },
      { key: 'purchaseDate', labelKey: 'field.purchaseDate', type: 'date' },
      { key: 'status', labelKey: 'field.status', type: 'select', wide: true,
        options: [
          { value: 'in_stock', label: I18n.t('status.in_stock') },
          { value: 'reserved', label: I18n.t('status.reserved') },
          { value: 'sold', label: I18n.t('status.sold') },
        ] },
      { key: 'notes', labelKey: 'field.notes', type: 'textarea', wide: true },
    ];
  }

  function buildFormField(field, car) {
    const wrap = document.createElement('label');
    wrap.className = field.wide ? 'form-field form-field-wide' : 'form-field';
    wrap.textContent = I18n.t(field.labelKey) + (field.required ? ' *' : '');

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
    // keptExisting: photo URLs already on the car that the user hasn't
    // removed. newFiles: photos picked in this session, not yet uploaded.
    // removedExisting: existing URLs the user removed — their storage
    // files get cleaned up after a successful save (not before, in case
    // the dialog is cancelled).
    const state = {
      keptExisting: car && car.photoUrls ? [...car.photoUrls] : [],
      newFiles: [],
      removedExisting: [],
    };

    const wrap = document.createElement('div');
    wrap.className = 'photo-field form-field-wide';

    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    wrap.appendChild(grid);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    wrap.appendChild(fileInput);

    const addTile = document.createElement('button');
    addTile.type = 'button';
    addTile.className = 'photo-add-tile';
    addTile.textContent = I18n.t('inventory.addPhoto');
    addTile.addEventListener('click', () => fileInput.click());

    function photoThumb(url, onRemove) {
      const box = document.createElement('div');
      box.className = 'photo-thumb';
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      box.appendChild(img);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'photo-thumb-remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', I18n.t('inventory.removePhoto'));
      removeBtn.addEventListener('click', onRemove);
      box.appendChild(removeBtn);
      return box;
    }

    function renderGrid() {
      grid.innerHTML = '';
      state.keptExisting.forEach((url, idx) => {
        grid.appendChild(
          photoThumb(url, () => {
            state.keptExisting.splice(idx, 1);
            state.removedExisting.push(url);
            renderGrid();
          })
        );
      });
      // Each entry's object URL is created once (in the change handler
      // below) and reused here — creating a fresh one on every render
      // would leak a blob URL per re-render, never revoked.
      state.newFiles.forEach((entry, idx) => {
        grid.appendChild(
          photoThumb(entry.previewUrl, () => {
            URL.revokeObjectURL(entry.previewUrl);
            state.newFiles.splice(idx, 1);
            renderGrid();
          })
        );
      });
      grid.appendChild(addTile);
    }

    fileInput.addEventListener('change', () => {
      Array.from(fileInput.files).forEach((file) => {
        state.newFiles.push({ file, previewUrl: URL.createObjectURL(file) });
      });
      fileInput.value = '';
      renderGrid();
    });

    renderGrid();
    return { element: wrap, state, refresh: renderGrid };
  }

  function openCarDialog(car, onSaved) {
    const fields = buildFields();
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = I18n.t(car ? 'inventory.editCarTitle' : 'inventory.addCarTitle');
    form.appendChild(h2);

    const photo = buildPhotoField(car);
    form.appendChild(photo.element);

    fields.forEach((field) => form.appendChild(buildFormField(field, car)));

    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-error hidden';
    form.appendChild(errorMsg);

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = I18n.t('action.cancel');
    cancelBtn.addEventListener('click', () => dialog.close());
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'primary';
    saveBtn.textContent = I18n.t('action.save');
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.add('hidden');
      const data = car ? { ...car } : {};
      for (const field of fields) {
        const input = form.elements[field.key];
        let value = input.value;
        if (field.type === 'number') value = value === '' ? '' : Number(value);
        if (field.required && (value === '' || value == null)) {
          errorMsg.textContent = I18n.t('validation.fieldRequired', { field: I18n.t(field.labelKey) });
          errorMsg.classList.remove('hidden');
          input.focus();
          return;
        }
        data[field.key] = value;
      }
      if (!data.status) data.status = 'in_stock';

      saveBtn.disabled = true;
      if (photo.state.newFiles.length > 0) {
        const pending = photo.state.newFiles;
        const results = await Promise.allSettled(
          pending.map((entry) => Storage.uploadCarPhoto(entry.file))
        );

        // Move only the successful uploads out of newFiles, so a retry
        // (clicking Save again after fixing the error) doesn't re-upload
        // files that already succeeded as new, orphaned storage objects.
        const stillPending = [];
        const failures = [];
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            photo.state.keptExisting.push(result.value);
            URL.revokeObjectURL(pending[idx].previewUrl);
          } else {
            stillPending.push(pending[idx]);
            failures.push(result.reason.message || String(result.reason));
          }
        });
        photo.state.newFiles = stillPending;

        if (failures.length > 0) {
          photo.refresh();
          errorMsg.textContent = `Failed to upload ${failures.length} photo(s): ${failures[0]}`;
          errorMsg.classList.remove('hidden');
          saveBtn.disabled = false;
          return;
        }
      }
      data.photoUrls = [...photo.state.keptExisting];

      try {
        await Storage.saveCar(data);
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = false;
        return;
      }
      if (photo.state.removedExisting.length) {
        Promise.allSettled(photo.state.removedExisting.map((url) => Storage.deleteCarPhoto(url)));
      }
      App.showToast(I18n.t(car ? 'toast.carUpdated' : 'toast.carAdded'));
      dialog.close();
      dialog.remove();
      onSaved();
    });

    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => {
      photo.state.newFiles.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      dialog.remove();
    });
    dialog.showModal();
  }

  async function render(root) {
    const state = { filter: 'all', search: '', sort: { key: null, dir: 1 }, page: 1 };
    let allCars = [];

    root.innerHTML = '<div class="page-loading">Loading…</div>';
    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = I18n.t('inventory.title');
    header.appendChild(h1);

    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = I18n.t('inventory.exportCsv');
    exportBtn.addEventListener('click', () => {
      const columns = [
        { key: 'make', label: I18n.t('field.make') },
        { key: 'model', label: I18n.t('field.model') },
        { key: 'year', label: I18n.t('field.year') },
        { key: 'vin', label: I18n.t('field.vin') },
        { key: 'color', label: I18n.t('field.color') },
        { key: 'mileage', label: I18n.t('field.mileage') },
        { key: 'purchasePrice', label: I18n.t('field.purchasePrice') },
        { key: 'additionalCosts', label: I18n.t('field.additionalCosts') },
        { key: 'askingPrice', label: I18n.t('field.askingPrice') },
        { key: 'purchaseDate', label: I18n.t('field.purchaseDate') },
        { key: 'status', label: I18n.t('field.status') },
        { key: 'notes', label: I18n.t('field.notes') },
      ];
      Helpers.downloadCsv(`inventory-${Helpers.todayLocal()}.csv`, Helpers.toCsv(allCars, columns));
    });
    headerActions.appendChild(exportBtn);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = I18n.t('inventory.addCar');
    addBtn.addEventListener('click', () => openCarDialog(null, reload));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = I18n.t('inventory.searchPlaceholder');
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      state.page = 1;
      renderRows();
    });
    controls.appendChild(searchInput);

    const filterSelect = document.createElement('select');
    [
      { value: 'all', label: I18n.t('inventory.allStatuses') },
      { value: 'in_stock', label: I18n.t('status.in_stock') },
      { value: 'reserved', label: I18n.t('status.reserved') },
      { value: 'sold', label: I18n.t('status.sold') },
    ].forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      filterSelect.appendChild(o);
    });
    filterSelect.addEventListener('change', () => {
      state.filter = filterSelect.value;
      state.page = 1;
      renderRows();
    });
    controls.appendChild(filterSelect);
    wrap.appendChild(controls);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.appendChild(document.createElement('th'));
    const SORT_COLUMNS = [
      ['make', I18n.t('table.make')],
      ['model', I18n.t('table.model')],
      ['year', I18n.t('table.year')],
      ['status', I18n.t('table.status')],
      ['purchasePrice', I18n.t('table.purchasePrice')],
      ['mileage', I18n.t('table.mileage')],
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
      make: (c) => c.make || '',
      model: (c) => c.model || '',
      year: (c) => Number(c.year) || 0,
      status: (c) => Helpers.statusLabel(c.status),
      purchasePrice: (c) => Number(c.purchasePrice) || 0,
      mileage: (c) => Number(c.mileage) || 0,
    };
    const PAGE_SIZE = 20;

    function applyFilters() {
      const filtered = allCars.filter((c) => {
        if (state.filter !== 'all' && c.status !== state.filter) return false;
        if (state.search) {
          const q = state.search.toLowerCase();
          const hay = `${c.make} ${c.model} ${c.vin || ''}`.toLowerCase();
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
      // Rebuild header sort-arrow indicators to reflect the current state.
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
          Helpers.emptyState(I18n.t(allCars.length === 0 ? 'inventory.noCarsYet' : 'inventory.noCarsMatch'))
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      const pageStart = (state.page - 1) * PAGE_SIZE;
      const cars = filtered.slice(pageStart, pageStart + PAGE_SIZE);

      pagination.innerHTML = '';
      if (totalPages > 1) {
        pagination.classList.remove('hidden');
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = I18n.t('pagination.previous');
        prevBtn.disabled = state.page === 1;
        prevBtn.addEventListener('click', () => {
          state.page -= 1;
          renderRows();
        });
        const label = document.createElement('span');
        label.textContent = I18n.t('pagination.pageOf', { page: state.page, total: totalPages });
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = I18n.t('pagination.next');
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
      cars.forEach((c) => {
        const days = Helpers.daysInStock(c);
        const isAging = c.status !== 'sold' && days !== null && days >= Helpers.AGING_THRESHOLD_DAYS;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${
            c.photoUrls && c.photoUrls.length
              ? `<div class="table-thumb-wrap">
                   <img class="table-thumb" alt="" src="${Helpers.escapeHtml(c.photoUrls[0])}">
                   ${c.photoUrls.length > 1 ? `<span class="table-thumb-count">+${c.photoUrls.length - 1}</span>` : ''}
                 </div>`
              : '<div class="table-thumb table-thumb-empty"></div>'
          }</td>
          <td>${Helpers.escapeHtml(c.make)}</td>
          <td>${Helpers.escapeHtml(c.model)}</td>
          <td>${Helpers.escapeHtml(c.year)}</td>
          <td>
            <span class="status-badge status-${c.status}">${Helpers.statusLabel(c.status)}</span>
            ${isAging ? `<span class="aging-note">${I18n.t('dashboard.daysInStockCell', { days })}</span>` : ''}
          </td>
          <td>${Helpers.formatCurrency(c.purchasePrice)}</td>
          <td>${c.mileage ? Number(c.mileage).toLocaleString() : '—'}</td>
          <td class="row-actions"></td>
        `;
        if (c.photoUrls && c.photoUrls.length) {
          tr.querySelector('.table-thumb-wrap').addEventListener('click', () =>
            openPhotoViewer(c.photoUrls, 0)
          );
        }
        const actionsCell = tr.querySelector('.row-actions');
        if (c.status !== 'sold') {
          const flyerBtn = Helpers.iconButton('flyer', I18n.t('action.shareFlyer'));
          flyerBtn.addEventListener('click', async () => {
            flyerBtn.disabled = true;
            try {
              const result = await Flyer.shareFlyer(c);
              if (result.method === 'download') {
                App.showInfo(I18n.t('sales.shareUnavailable'));
              }
            } catch (err) {
              App.showError(err.message);
            } finally {
              flyerBtn.disabled = false;
            }
          });
          actionsCell.appendChild(flyerBtn);

          const sellBtn = Helpers.iconButton('sell', I18n.t('action.sell'));
          sellBtn.addEventListener('click', () =>
            SaleDialog.open(null, { onSaved: reload, presetCarId: c.id })
          );
          actionsCell.appendChild(sellBtn);
        }
        const editBtn = Helpers.iconButton('edit', I18n.t('action.edit'));
        editBtn.addEventListener('click', () => openCarDialog(c, reload));
        const deleteBtn = Helpers.iconButton('delete', I18n.t('action.delete'), 'danger');
        deleteBtn.addEventListener('click', async () => {
          const ok = await ConfirmDialog.open({
            title: I18n.t('inventory.deleteCarTitle'),
            message: I18n.t('inventory.deleteCarMessage', { name: `${c.year} ${c.make} ${c.model}` }),
          });
          if (!ok) return;
          try {
            await Storage.deleteCar(c.id);
            App.showToast(I18n.t('toast.carDeleted'));
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
