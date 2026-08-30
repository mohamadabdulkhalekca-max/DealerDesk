/** Expenses view: recurring overhead (rent, ads, wages, utilities) tracked separately from per-car costs. */
(function () {
  function categoryOptions() {
    return [
      { value: 'rent', label: I18n.t('expenseCategory.rent') },
      { value: 'ads', label: I18n.t('expenseCategory.ads') },
      { value: 'wages', label: I18n.t('expenseCategory.wages') },
      { value: 'utilities', label: I18n.t('expenseCategory.utilities') },
      { value: 'other', label: I18n.t('expenseCategory.other') },
    ];
  }

  function buildFields() {
    return [
      { key: 'category', labelKey: 'field.category', type: 'select', options: categoryOptions() },
      { key: 'description', labelKey: 'field.description', type: 'text', required: true },
      { key: 'amount', labelKey: 'field.amount', type: 'number', required: true },
      { key: 'expenseDate', labelKey: 'field.expenseDate', type: 'date' },
      { key: 'notes', labelKey: 'field.notes', type: 'textarea', wide: true },
    ];
  }

  function buildFormField(field, expense) {
    const wrap = document.createElement('label');
    wrap.className = field.wide ? 'form-field form-field-wide' : 'form-field';

    const labelText = document.createElement('span');
    labelText.className = 'form-field-label-text';
    labelText.textContent = I18n.t(field.labelKey) + (field.required ? ' *' : '');
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
    } else {
      input = document.createElement('input');
      input.type = field.type;
    }
    input.name = field.key;
    if (field.required) input.required = true;
    if (expense && expense[field.key] != null) input.value = expense[field.key];
    else if (field.key === 'category') input.value = 'other';
    else if (field.key === 'expenseDate') input.value = Helpers.todayLocal();

    wrap.appendChild(input);
    return { wrap, input, field };
  }

  function openExpenseDialog(expense, onSaved) {
    const fields = buildFields();

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = I18n.t(expense ? 'expenses.editExpenseTitle' : 'expenses.addExpenseTitle');
    form.appendChild(h2);

    const built = fields.map((field) => buildFormField(field, expense));
    built.forEach(({ wrap }) => form.appendChild(wrap));

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
      const data = expense ? { ...expense } : {};
      for (const { field, input } of built) {
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

      saveBtn.disabled = true;
      try {
        await Storage.saveExpense(data);
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = false;
        return;
      }
      App.showToast(I18n.t(expense ? 'toast.expenseUpdated' : 'toast.expenseAdded'));
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
    const state = { search: '', sort: { key: 'expenseDate', dir: -1 } };
    let allExpenses = [];

    root.innerHTML = '<div class="page-loading">Loading…</div>';
    const wrap = document.createElement('div');
    wrap.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = I18n.t('expenses.title');
    header.appendChild(h1);

    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = I18n.t('inventory.exportCsv');
    exportBtn.addEventListener('click', () => {
      const columns = [
        { key: 'expenseDate', label: I18n.t('table.date') },
        { key: 'category', label: I18n.t('field.category') },
        { key: 'description', label: I18n.t('field.description') },
        { key: 'amount', label: I18n.t('field.amount') },
        { key: 'notes', label: I18n.t('field.notes') },
      ];
      Helpers.downloadCsv(`expenses-${Helpers.todayLocal()}.csv`, Helpers.toCsv(allExpenses, columns));
    });
    headerActions.appendChild(exportBtn);
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = I18n.t('expenses.addExpense');
    addBtn.addEventListener('click', () => openExpenseDialog(null, reload));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'toolbar';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = I18n.t('expenses.searchPlaceholder');
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      renderRows();
    });
    controls.appendChild(searchInput);
    wrap.appendChild(controls);

    const totalCard = document.createElement('div');
    totalCard.className = 'stats-grid';
    wrap.appendChild(totalCard);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const SORT_COLUMNS = [
      ['expenseDate', I18n.t('table.date')],
      ['category', I18n.t('field.category')],
      ['description', I18n.t('field.description')],
      ['amount', I18n.t('field.amount')],
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
      expenseDate: (e) => e.expenseDate || '',
      category: (e) => Helpers.expenseCategoryLabel(e.category),
      description: (e) => e.description || '',
      amount: (e) => Number(e.amount) || 0,
    };

    function applyFilters() {
      const filtered = allExpenses.filter((e) => {
        if (state.search) {
          const q = state.search.toLowerCase();
          const hay = `${e.description || ''} ${e.notes || ''}`.toLowerCase();
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

      totalCard.innerHTML = '';
      const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalDiv = document.createElement('div');
      totalDiv.className = 'stat-card';
      totalDiv.innerHTML = `<div class="stat-value">${Helpers.formatCurrency(total)}</div><div class="stat-label">${I18n.t('expenses.totalExpenses')}</div>`;
      totalCard.appendChild(totalDiv);

      emptyWrap.innerHTML = '';
      if (filtered.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(
          Helpers.emptyState(I18n.t(allExpenses.length === 0 ? 'expenses.noExpensesYet' : 'expenses.noExpensesMatch'))
        );
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      filtered.forEach((e) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(e.expenseDate)}</td>
          <td><span class="status-badge">${Helpers.expenseCategoryLabel(e.category)}</span></td>
          <td>${Helpers.escapeHtml(e.description || '—')}</td>
          <td>${Helpers.formatCurrency(e.amount)}</td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
        const editBtn = Helpers.iconButton('edit', I18n.t('action.edit'));
        editBtn.addEventListener('click', () => openExpenseDialog(e, reload));
        const deleteBtn = Helpers.iconButton('delete', I18n.t('action.delete'), 'danger');
        deleteBtn.addEventListener('click', async () => {
          const ok = await ConfirmDialog.open({
            title: I18n.t('expenses.deleteExpenseTitle'),
            message: I18n.t('expenses.deleteExpenseMessage', { name: e.description || Helpers.expenseCategoryLabel(e.category) }),
          });
          if (!ok) return;
          try {
            await Storage.deleteExpense(e.id);
            App.showToast(I18n.t('toast.expenseDeleted'));
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
        allExpenses = await Storage.getExpenses();
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
  window.Views.expenses = { render };
})();
