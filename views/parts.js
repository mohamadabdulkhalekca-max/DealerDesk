/** Parts view: auto parts/oils/tires inventory — quantity-based, unlike cars. */
(function () {
  function categoryOptions() {
    return [
      { value: 'oil', label: I18n.t('category.oil') },
      { value: 'tire', label: I18n.t('category.tire') },
      { value: 'part', label: I18n.t('category.part') },
      { value: 'other', label: I18n.t('category.other') },
    ];
  }

  // Suggestions only (via <datalist>), not a closed enum — the trader can
  // always type something else. Part-type names are localized since
  // they're common category words; grade/size codes are the same
  // alphanumeric strings regardless of language.
  function partTypeOptions() {
    return I18n.isRtl()
      ? ['صدام', 'مصباح أمامي', 'مصباح خلفي', 'مرآة', 'باب', 'غطاء المحرك', 'رفرف', 'زجاج أمامي', 'تيل فرامل', 'قرص فرامل', 'بطارية', 'فلتر هواء', 'فلتر زيت', 'سير', 'رادياتير', 'دينامو', 'مارش', 'نظام تعليق', 'شكمان', 'جنط']
      : ['Bumper', 'Headlight', 'Taillight', 'Mirror', 'Door', 'Hood', 'Fender', 'Windshield', 'Brake Pad', 'Brake Disc', 'Battery', 'Air Filter', 'Oil Filter', 'Belt', 'Radiator', 'Alternator', 'Starter Motor', 'Suspension', 'Exhaust', 'Wheel Rim'];
  }

  function oilGradeOptions() {
    return ['0W-20', '5W-20', '5W-30', '5W-40', '10W-30', '10W-40', '15W-40', '20W-50'];
  }

  function tireSizeOptions() {
    return ['185/65R15', '195/65R15', '205/55R16', '205/60R16', '215/55R17', '215/60R16', '225/45R17', '225/50R17', '225/55R17', '235/55R18', '235/60R18', '245/45R18', '265/60R18'];
  }

  function buildFields() {
    return [
      { key: 'name', labelKey: 'field.name', oilLabelKey: 'field.brand', type: 'text', required: true },
      { key: 'category', labelKey: 'field.category', type: 'select', options: categoryOptions() },
      { key: 'partType', labelKey: 'field.partType', type: 'datalist', options: partTypeOptions(), showFor: ['part'] },
      { key: 'compatibleVehicle', labelKey: 'field.compatibleVehicle', type: 'text', showFor: ['part'] },
      { key: 'grade', labelKey: 'field.grade', type: 'datalist', options: oilGradeOptions(), showFor: ['oil'] },
      { key: 'size', labelKey: 'field.size', type: 'datalist', options: tireSizeOptions(), showFor: ['tire'] },
      { key: 'sku', labelKey: 'field.sku', type: 'text' },
      { key: 'quantity', labelKey: 'field.quantity', type: 'number', required: true },
      { key: 'costPrice', labelKey: 'field.costPrice', type: 'number', required: true },
      { key: 'askingPrice', labelKey: 'field.askingPricePerUnit', type: 'number' },
      { key: 'notes', labelKey: 'field.notes', type: 'textarea', wide: true },
    ];
  }

  let datalistCounter = 0;

  function buildFormField(field, part) {
    const wrap = document.createElement('label');
    wrap.className = field.wide ? 'form-field form-field-wide' : 'form-field';
    if (field.showFor) wrap.dataset.showFor = field.showFor.join(' ');

    const labelText = document.createElement('span');
    labelText.className = 'form-field-label-text';
    wrap.appendChild(labelText);

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
    } else if (field.type === 'datalist') {
      input = document.createElement('input');
      input.type = 'text';
      const listId = `dl-${field.key}-${datalistCounter++}`;
      input.setAttribute('list', listId);
      const datalist = document.createElement('datalist');
      datalist.id = listId;
      field.options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        datalist.appendChild(o);
      });
      wrap.appendChild(datalist);
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
    return { wrap, input, labelText, field };
  }

  function openPartDialog(part, onSaved) {
    const fields = buildFields();

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = I18n.t(part ? 'parts.editPartTitle' : 'parts.addPartTitle');
    form.appendChild(h2);

    const built = fields.map((field) => buildFormField(field, part));
    built.forEach(({ wrap }) => form.appendChild(wrap));

    const nameField = built.find(({ field }) => field.key === 'name');
    const categoryField = built.find(({ field }) => field.key === 'category');

    function applyLabels() {
      const category = categoryField.input.value;
      built.forEach(({ wrap, labelText, field }) => {
        const key = field.key === 'name' && category === 'oil' ? field.oilLabelKey : field.labelKey;
        labelText.textContent = I18n.t(key) + (field.required ? ' *' : '');
        if (field.showFor) wrap.classList.toggle('hidden', !field.showFor.includes(category));
      });
    }
    applyLabels();
    categoryField.input.addEventListener('change', applyLabels);
    void nameField; // referenced above via built.find; kept for clarity

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
      const data = part ? { ...part } : {};
      for (const { field, input, wrap } of built) {
        const hidden = wrap.classList.contains('hidden');
        let value = input.value;
        if (field.type === 'number') value = value === '' ? '' : Number(value);
        if (!hidden && field.required && (value === '' || value == null)) {
          const category = categoryField.input.value;
          const labelKey = field.key === 'name' && category === 'oil' ? field.oilLabelKey : field.labelKey;
          errorMsg.textContent = I18n.t('validation.fieldRequired', { field: I18n.t(labelKey) });
          errorMsg.classList.remove('hidden');
          input.focus();
          return;
        }
        data[field.key] = hidden ? '' : value;
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
      App.showToast(I18n.t(part ? 'toast.partUpdated' : 'toast.partAdded'));
      dialog.close();
      dialog.remove();
      onSaved();
    });

    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }

  function partDetails(p) {
    if (p.category === 'oil') return p.grade || '';
    if (p.category === 'tire') return p.size || '';
    if (p.category === 'part') return [p.partType, p.compatibleVehicle].filter(Boolean).join(' · ');
    return '';
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
    h1.textContent = I18n.t('parts.title');
    header.appendChild(h1);

    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = I18n.t('inventory.exportCsv');
    exportBtn.addEventListener('click', () => {
      const columns = [
        { key: 'name', label: I18n.t('field.name') },
        { key: 'category', label: I18n.t('field.category') },
        { key: 'partType', label: I18n.t('field.partType') },
        { key: 'compatibleVehicle', label: I18n.t('field.compatibleVehicle') },
        { key: 'grade', label: I18n.t('field.grade') },
        { key: 'size', label: I18n.t('field.size') },
        { key: 'sku', label: I18n.t('field.sku') },
        { key: 'quantity', label: I18n.t('table.quantity') },
        { key: 'costPrice', label: I18n.t('table.costPrice') },
        { key: 'askingPrice', label: I18n.t('table.askingPrice') },
        { key: 'notes', label: I18n.t('field.notes') },
      ];
      Helpers.downloadCsv(`parts-${Helpers.todayLocal()}.csv`, Helpers.toCsv(allParts, columns));
    });
    headerActions.appendChild(exportBtn);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = I18n.t('parts.addPart');
    addBtn.addEventListener('click', () => openPartDialog(null, reload));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = I18n.t('parts.searchPlaceholder');
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      state.page = 1;
      renderRows();
    });
    controls.appendChild(searchInput);

    const categorySelect = document.createElement('select');
    [{ value: 'all', label: I18n.t('parts.allCategories') }, ...categoryOptions()].forEach((opt) => {
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
      ['name', I18n.t('table.name')],
      ['category', I18n.t('table.category')],
      ['sku', I18n.t('table.sku')],
      ['quantity', I18n.t('table.quantity')],
      ['costPrice', I18n.t('table.costPrice')],
      ['askingPrice', I18n.t('table.askingPrice')],
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
          Helpers.emptyState(I18n.t(allParts.length === 0 ? 'parts.noPartsYet' : 'parts.noPartsMatch'))
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
      parts.forEach((p) => {
        const outOfStock = Number(p.quantity) <= 0;
        const details = partDetails(p);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            ${Helpers.escapeHtml(p.name)}
            ${details ? `<span class="aging-note" style="color: var(--text-muted)">${Helpers.escapeHtml(details)}</span>` : ''}
          </td>
          <td><span class="status-badge status-part-${p.category}">${Helpers.partCategoryLabel(p.category)}</span></td>
          <td>${p.sku ? Helpers.escapeHtml(p.sku) : '—'}</td>
          <td>${outOfStock ? `<span class="status-badge status-sold">${I18n.t('parts.outOfStock')}</span>` : p.quantity}</td>
          <td>${Helpers.formatCurrency(p.costPrice)}</td>
          <td>${p.askingPrice != null ? Helpers.formatCurrency(p.askingPrice) : '—'}</td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
        if (!outOfStock) {
          const sellBtn = Helpers.iconButton('sell', I18n.t('action.sell'));
          sellBtn.addEventListener('click', () =>
            SaleDialog.open(null, { onSaved: reload, presetPartId: p.id })
          );
          actionsCell.appendChild(sellBtn);
        }
        const editBtn = Helpers.iconButton('edit', I18n.t('action.edit'));
        editBtn.addEventListener('click', () => openPartDialog(p, reload));
        const deleteBtn = Helpers.iconButton('delete', I18n.t('action.delete'), 'danger');
        deleteBtn.addEventListener('click', async () => {
          const ok = await ConfirmDialog.open({
            title: I18n.t('parts.deletePartTitle'),
            message: I18n.t('parts.deletePartMessage', { name: p.name }),
          });
          if (!ok) return;
          try {
            await Storage.deletePart(p.id);
            App.showToast(I18n.t('toast.partDeleted'));
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
