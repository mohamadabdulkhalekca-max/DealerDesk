/** Sales view: sale list with add/edit/delete, linked to inventory cars. */
(function () {
  function carLabel(car) {
    if (!car) return 'Unknown car';
    return `${car.year} ${car.make} ${car.model}`;
  }

  function availableCarsFor(cars, sale) {
    return cars.filter((c) => c.status !== 'sold' || (sale && sale.carId === c.id));
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

    async function reload() {
      let cars, sales;
      try {
        [cars, sales] = await Promise.all([Storage.getCars(), Storage.getSales()]);
      } catch (err) {
        App.showError(err.message);
        return;
      }
      sales = [...sales].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

      emptyWrap.innerHTML = '';
      if (sales.length === 0) {
        tableWrap.classList.add('hidden');
        emptyWrap.appendChild(Helpers.emptyState('No sales recorded yet.'));
        return;
      }
      tableWrap.classList.remove('hidden');

      tbody.innerHTML = '';
      sales.forEach((s) => {
        const car = cars.find((c) => c.id === s.carId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${Helpers.escapeHtml(carLabel(car))}</td>
          <td>${Helpers.escapeHtml(s.buyerName)}</td>
          <td>${Helpers.formatCurrency(s.salePrice)}</td>
          <td>${Helpers.formatCurrency(Helpers.saleProfit(s, cars))}</td>
          <td>${Helpers.escapeHtml(s.saleDate)}</td>
          <td><span class="status-badge status-${s.paymentStatus}">${s.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span></td>
          <td class="row-actions"></td>
        `;
        const actionsCell = tr.querySelector('.row-actions');
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
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        tbody.appendChild(tr);
      });
    }

    root.innerHTML = '';
    root.appendChild(wrap);
    await reload();
  }

  window.Views = window.Views || {};
  window.Views.sales = { render };
})();
