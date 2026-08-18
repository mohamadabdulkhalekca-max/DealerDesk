/**
 * Add/Edit Sale dialog, shared by the Sales view ("+ Add Sale" / "Edit")
 * and the "Sell" action on Inventory/Parts rows. A sale is an order: a
 * cart of one or more line items, each either a car (qty always 1) or a
 * part (qty-based), plus buyer/payment details for the whole order.
 */
(function () {
  function carLabel(car) {
    if (!car) return 'Unknown car';
    return `${car.year} ${car.make} ${car.model}`;
  }

  function defaultCarPrice(car) {
    return car.askingPrice != null ? car.askingPrice : car.purchasePrice;
  }

  function defaultPartPrice(part) {
    return part.askingPrice != null ? part.askingPrice : part.costPrice;
  }

  /**
   * @param {object|null} sale - existing sale to edit, or null to add one.
   * @param {object} options
   * @param {() => void} options.onSaved - called after a successful save.
   * @param {string} [options.presetCarId] - car to add when opening fresh.
   * @param {string} [options.presetPartId] - part to add when opening fresh.
   */
  async function open(sale, { onSaved, presetCarId, presetPartId } = {}) {
    let cars, parts;
    try {
      [cars, parts] = await Promise.all([Storage.getCars(), Storage.getParts()]);
    } catch (err) {
      App.showError(err.message);
      return;
    }

    // What this specific sale (if editing) already had reserved, so its
    // own existing allocation doesn't count against "available" stock.
    const originalCarIds = new Set();
    const originalPartQty = {};
    if (sale) {
      (sale.items || []).forEach((item) => {
        if (item.itemType === 'car') originalCarIds.add(item.carId);
        else originalPartQty[item.partId] = (originalPartQty[item.partId] || 0) + item.quantity;
      });
    }

    const cart = sale ? (sale.items || []).map((item) => ({ ...item })) : [];

    if (presetCarId && !cart.some((i) => i.itemType === 'car' && i.carId === presetCarId)) {
      const car = cars.find((c) => c.id === presetCarId);
      if (car) cart.push({ itemType: 'car', carId: car.id, quantity: 1, unitPrice: defaultCarPrice(car) });
    }
    if (presetPartId && !cart.some((i) => i.itemType === 'part' && i.partId === presetPartId)) {
      const part = parts.find((p) => p.id === presetPartId);
      if (part) cart.push({ itemType: 'part', partId: part.id, quantity: 1, unitPrice: defaultPartPrice(part) });
    }

    function effectivePartQty(part) {
      return part.quantity + (originalPartQty[part.id] || 0);
    }

    function otherCartQtyForPart(partId, excludeIdx) {
      return cart.reduce(
        (sum, i, j) => (j !== excludeIdx && i.itemType === 'part' && i.partId === partId ? sum + i.quantity : sum),
        0
      );
    }

    function remainingPartQty(part) {
      return effectivePartQty(part) - otherCartQtyForPart(part.id, -1);
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'dialog-form';

    const h2 = document.createElement('h2');
    h2.textContent = sale ? 'Edit Sale' : 'Add Sale';
    form.appendChild(h2);

    // --- Cart ---
    const cartField = document.createElement('div');
    cartField.className = 'form-field-wide cart-field';

    const cartLabel = document.createElement('div');
    cartLabel.className = 'cart-field-label';
    cartLabel.textContent = 'Items *';
    cartField.appendChild(cartLabel);

    const itemsList = document.createElement('div');
    itemsList.className = 'cart-list';
    cartField.appendChild(itemsList);

    const addRow = document.createElement('div');
    addRow.className = 'cart-add-row';

    const carSelect = document.createElement('select');
    const partSelect = document.createElement('select');

    function fillCarSelect() {
      const usedIds = new Set(cart.filter((i) => i.itemType === 'car').map((i) => i.carId));
      const choices = cars.filter((c) => (c.status !== 'sold' || originalCarIds.has(c.id)) && !usedIds.has(c.id));
      carSelect.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '+ Add a car…';
      carSelect.appendChild(placeholder);
      choices.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = carLabel(c);
        carSelect.appendChild(o);
      });
    }

    function fillPartSelect() {
      const choices = parts.filter((p) => remainingPartQty(p) > 0);
      partSelect.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '+ Add a part…';
      partSelect.appendChild(placeholder);
      choices.forEach((p) => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = `${p.name} (${remainingPartQty(p)} available)`;
        partSelect.appendChild(o);
      });
    }

    carSelect.addEventListener('change', () => {
      const car = cars.find((c) => c.id === carSelect.value);
      if (!car) return;
      cart.push({ itemType: 'car', carId: car.id, quantity: 1, unitPrice: defaultCarPrice(car) });
      renderCart();
    });

    partSelect.addEventListener('change', () => {
      const part = parts.find((p) => p.id === partSelect.value);
      if (!part) return;
      const existing = cart.find((i) => i.itemType === 'part' && i.partId === part.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ itemType: 'part', partId: part.id, quantity: 1, unitPrice: defaultPartPrice(part) });
      }
      renderCart();
    });

    addRow.appendChild(carSelect);
    addRow.appendChild(partSelect);
    cartField.appendChild(addRow);

    const totalLine = document.createElement('div');
    totalLine.className = 'cart-total';
    cartField.appendChild(totalLine);

    function updateTotal() {
      const total = cart.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 1), 0);
      totalLine.textContent = `Total: ${Helpers.formatCurrency(total)}`;
    }

    function renderCart() {
      itemsList.innerHTML = '';
      if (cart.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cart-empty';
        empty.textContent = 'No items added yet.';
        itemsList.appendChild(empty);
      }

      cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'cart-row';

        const label = document.createElement('div');
        label.className = 'cart-row-label';
        label.textContent =
          item.itemType === 'car' ? carLabel(cars.find((c) => c.id === item.carId)) : (parts.find((p) => p.id === item.partId) || {}).name || 'Unknown part';
        row.appendChild(label);

        if (item.itemType === 'part') {
          const qtyInput = document.createElement('input');
          qtyInput.type = 'number';
          qtyInput.min = '1';
          qtyInput.className = 'cart-qty-input';
          qtyInput.value = item.quantity;
          qtyInput.title = 'Quantity';
          qtyInput.addEventListener('change', () => {
            const part = parts.find((p) => p.id === item.partId);
            const max = part ? effectivePartQty(part) - otherCartQtyForPart(item.partId, idx) : item.quantity;
            let val = Math.floor(Number(qtyInput.value) || 1);
            val = Math.max(1, Math.min(val, Math.max(1, max)));
            item.quantity = val;
            renderCart();
          });
          row.appendChild(qtyInput);
        }

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.step = '0.01';
        priceInput.min = '0';
        priceInput.className = 'cart-price-input';
        priceInput.value = item.unitPrice;
        priceInput.title = 'Unit price';
        priceInput.addEventListener('change', () => {
          item.unitPrice = Number(priceInput.value) || 0;
          updateTotal();
        });
        row.appendChild(priceInput);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'cart-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', 'Remove item');
        removeBtn.addEventListener('click', () => {
          cart.splice(idx, 1);
          renderCart();
        });
        row.appendChild(removeBtn);

        itemsList.appendChild(row);
      });

      fillCarSelect();
      fillPartSelect();
      updateTotal();
    }

    form.appendChild(cartField);

    // --- Buyer / order fields ---
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
    notesLabel.className = 'form-field form-field-wide';
    notesLabel.textContent = 'Notes';
    const notesInput = document.createElement('textarea');
    notesInput.name = 'notes';
    if (sale) notesInput.value = sale.notes || '';
    notesLabel.appendChild(notesInput);
    form.appendChild(notesLabel);

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

      const buyerName = buyerNameInput.value.trim();
      if (!buyerName) {
        errorMsg.textContent = 'Buyer Name is required.';
        errorMsg.classList.remove('hidden');
        buyerNameInput.focus();
        return;
      }
      if (cart.length === 0) {
        errorMsg.textContent = 'Add at least one car or part to the sale.';
        errorMsg.classList.remove('hidden');
        return;
      }

      const data = {
        ...(sale || {}),
        buyerName,
        buyerContact: buyerContactInput.value.trim(),
        saleDate: saleDateInput.value,
        paymentStatus: paymentSelect.value,
        notes: notesInput.value.trim(),
        items: cart,
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
      App.showToast(sale ? 'Sale updated' : 'Sale recorded');
      dialog.close();
      dialog.remove();
      if (onSaved) onSaved();
    });

    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();

    renderCart();
  }

  window.SaleDialog = { open };
})();
