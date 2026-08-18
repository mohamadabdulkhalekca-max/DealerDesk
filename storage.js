/**
 * Data layer. Every read/write to persisted data goes through here,
 * backed by Supabase (Postgres). Callers use camelCase field names;
 * this module maps to/from the database's snake_case columns so the
 * rest of the app never deals with that translation.
 */
(function () {
  const db = window.SupabaseClient;

  function carFromRow(row) {
    return {
      id: row.id,
      make: row.make,
      model: row.model,
      year: row.year,
      vin: row.vin,
      color: row.color,
      mileage: row.mileage,
      purchasePrice: row.purchase_price,
      additionalCosts: row.additional_costs,
      askingPrice: row.asking_price,
      purchaseDate: row.purchase_date,
      status: row.status,
      notes: row.notes,
      photoUrls: row.photo_urls || [],
    };
  }

  function carToRow(car) {
    const row = {};
    if (car.make !== undefined) row.make = car.make;
    if (car.model !== undefined) row.model = car.model;
    if (car.year !== undefined) row.year = car.year;
    if (car.vin !== undefined) row.vin = car.vin || null;
    if (car.color !== undefined) row.color = car.color || null;
    if (car.mileage !== undefined) row.mileage = car.mileage === '' ? null : car.mileage;
    if (car.purchasePrice !== undefined) row.purchase_price = car.purchasePrice;
    if (car.additionalCosts !== undefined) row.additional_costs = car.additionalCosts === '' ? 0 : car.additionalCosts;
    if (car.askingPrice !== undefined) row.asking_price = car.askingPrice === '' ? null : car.askingPrice;
    if (car.purchaseDate !== undefined) row.purchase_date = car.purchaseDate || null;
    if (car.status !== undefined) row.status = car.status;
    if (car.notes !== undefined) row.notes = car.notes || null;
    if (car.photoUrls !== undefined) row.photo_urls = car.photoUrls || [];
    return row;
  }

  function partFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      sku: row.sku,
      quantity: row.quantity,
      costPrice: row.cost_price,
      askingPrice: row.asking_price,
      notes: row.notes,
      partType: row.part_type,
      compatibleVehicle: row.compatible_vehicle,
      grade: row.grade,
      size: row.size,
    };
  }

  function partToRow(part) {
    const row = {};
    if (part.name !== undefined) row.name = part.name;
    if (part.category !== undefined) row.category = part.category;
    if (part.sku !== undefined) row.sku = part.sku || null;
    if (part.quantity !== undefined) row.quantity = part.quantity === '' ? 0 : part.quantity;
    if (part.costPrice !== undefined) row.cost_price = part.costPrice === '' ? 0 : part.costPrice;
    if (part.askingPrice !== undefined) row.asking_price = part.askingPrice === '' ? null : part.askingPrice;
    if (part.notes !== undefined) row.notes = part.notes || null;
    if (part.partType !== undefined) row.part_type = part.partType || null;
    if (part.compatibleVehicle !== undefined) row.compatible_vehicle = part.compatibleVehicle || null;
    if (part.grade !== undefined) row.grade = part.grade || null;
    if (part.size !== undefined) row.size = part.size || null;
    return row;
  }

  function saleFromRow(row) {
    return {
      id: row.id,
      buyerName: row.buyer_name,
      buyerContact: row.buyer_contact,
      saleDate: row.sale_date,
      paymentStatus: row.payment_status,
      notes: row.notes,
    };
  }

  function saleToRow(sale) {
    const row = {};
    if (sale.buyerName !== undefined) row.buyer_name = sale.buyerName;
    if (sale.buyerContact !== undefined) row.buyer_contact = sale.buyerContact || null;
    if (sale.saleDate !== undefined) row.sale_date = sale.saleDate || null;
    if (sale.paymentStatus !== undefined) row.payment_status = sale.paymentStatus;
    if (sale.notes !== undefined) row.notes = sale.notes || null;
    return row;
  }

  function saleItemFromRow(row) {
    return {
      id: row.id,
      saleId: row.sale_id,
      itemType: row.item_type,
      carId: row.car_id,
      partId: row.part_id,
      quantity: row.quantity,
      unitPrice: row.unit_price,
    };
  }

  function saleItemToRow(item) {
    return {
      sale_id: item.saleId,
      item_type: item.itemType,
      car_id: item.itemType === 'car' ? item.carId : null,
      part_id: item.itemType === 'part' ? item.partId : null,
      quantity: item.itemType === 'car' ? 1 : item.quantity,
      unit_price: item.unitPrice,
    };
  }

  function friendlyError(error, deleteBlockedMessage) {
    if (deleteBlockedMessage && error.code === '23503') {
      return new Error(deleteBlockedMessage);
    }
    return new Error(error.message);
  }

  // --- Cars ---

  async function getCars() {
    const { data, error } = await db.from('cars').select('*').order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return data.map(carFromRow);
  }

  async function getCar(id) {
    const { data, error } = await db.from('cars').select('*').eq('id', id).maybeSingle();
    if (error) throw friendlyError(error);
    return data ? carFromRow(data) : null;
  }

  async function saveCar(car) {
    const row = carToRow(car);
    if (car.id) {
      const { data, error } = await db.from('cars').update(row).eq('id', car.id).select().single();
      if (error) throw friendlyError(error);
      return carFromRow(data);
    }
    const { data, error } = await db.from('cars').insert(row).select().single();
    if (error) throw friendlyError(error);
    return carFromRow(data);
  }

  async function deleteCar(id) {
    // Fetched before deleting so we know which storage files to clean up
    // afterward — but only if the row delete actually succeeds (a car
    // blocked by a linked sale must keep its photos).
    const existing = await getCar(id);

    const { error } = await db.from('cars').delete().eq('id', id);
    if (error) {
      throw friendlyError(error, I18n.t('error.carDeleteBlocked'));
    }

    if (existing && existing.photoUrls && existing.photoUrls.length) {
      await Promise.allSettled(existing.photoUrls.map((url) => deleteCarPhoto(url)));
    }
  }

  async function uploadCarPhoto(file) {
    const {
      data: { session },
    } = await db.auth.getSession();
    const userId = session && session.user && session.user.id;
    if (!userId) throw new Error(I18n.t('error.needSignInPhoto'));

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage
      .from('car-photos')
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = db.storage.from('car-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  // Best-effort: removes the underlying file from the car-photos bucket
  // for a photo no longer referenced by any car. Silently no-ops if the
  // URL isn't a recognizable path in that bucket (never throws — this
  // runs as background cleanup, not something that should block a save).
  async function deleteCarPhoto(url) {
    const marker = '/car-photos/';
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length).split('?')[0];
    await db.storage.from('car-photos').remove([path]);
  }

  // --- Parts (auto parts / oils / tires — quantity-based, unlike cars) ---

  async function getParts() {
    const { data, error } = await db.from('parts').select('*').order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return data.map(partFromRow);
  }

  async function getPart(id) {
    const { data, error } = await db.from('parts').select('*').eq('id', id).maybeSingle();
    if (error) throw friendlyError(error);
    return data ? partFromRow(data) : null;
  }

  async function savePart(part) {
    const row = partToRow(part);
    if (part.id) {
      const { data, error } = await db.from('parts').update(row).eq('id', part.id).select().single();
      if (error) throw friendlyError(error);
      return partFromRow(data);
    }
    const { data, error } = await db.from('parts').insert(row).select().single();
    if (error) throw friendlyError(error);
    return partFromRow(data);
  }

  async function deletePart(id) {
    const { error } = await db.from('parts').delete().eq('id', id);
    if (error) {
      throw friendlyError(error, I18n.t('error.partDeleteBlocked'));
    }
  }

  // --- Sales (a sale is an order: one or more car and/or part line items) ---

  async function attachItems(salesRows) {
    const saleIds = salesRows.map((r) => r.id);
    if (saleIds.length === 0) return salesRows.map(saleFromRow).map((s) => ({ ...s, items: [] }));
    const { data: itemRows, error } = await db.from('sale_items').select('*').in('sale_id', saleIds);
    if (error) throw friendlyError(error);
    const itemsBySale = {};
    itemRows.forEach((row) => {
      const item = saleItemFromRow(row);
      (itemsBySale[item.saleId] = itemsBySale[item.saleId] || []).push(item);
    });
    return salesRows.map((row) => {
      const sale = saleFromRow(row);
      sale.items = itemsBySale[sale.id] || [];
      return sale;
    });
  }

  async function getSales() {
    const { data, error } = await db.from('sales').select('*').order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return attachItems(data);
  }

  async function getSale(id) {
    const { data, error } = await db.from('sales').select('*').eq('id', id).maybeSingle();
    if (error) throw friendlyError(error);
    if (!data) return null;
    const [sale] = await attachItems([data]);
    return sale;
  }

  // Puts a car back to "in_stock" / returns a part's quantity to stock —
  // used to undo a sale's effect on inventory, both when editing a sale
  // (revert-then-reapply, simpler and more reliable than diffing line
  // items) and when deleting one outright.
  async function releaseSaleItemEffects(items) {
    for (const item of items) {
      if (item.itemType === 'car') {
        await db.from('cars').update({ status: 'in_stock' }).eq('id', item.carId);
      } else {
        const { data } = await db.from('parts').select('quantity').eq('id', item.partId).maybeSingle();
        if (data) {
          await db.from('parts').update({ quantity: data.quantity + item.quantity }).eq('id', item.partId);
        }
      }
    }
  }

  async function applySaleItemEffects(items) {
    for (const item of items) {
      if (item.itemType === 'car') {
        await db.from('cars').update({ status: 'sold' }).eq('id', item.carId);
      } else {
        const { data } = await db.from('parts').select('quantity').eq('id', item.partId).maybeSingle();
        if (data) {
          const newQty = Math.max(0, data.quantity - item.quantity);
          await db.from('parts').update({ quantity: newQty }).eq('id', item.partId);
        }
      }
    }
  }

  async function saveSale(sale) {
    const items = sale.items || [];
    if (items.length === 0) throw new Error(I18n.t('error.needOneItem'));

    const row = saleToRow(sale);
    let savedHeader;

    if (sale.id) {
      const { data: oldRows, error: oldErr } = await db.from('sale_items').select('*').eq('sale_id', sale.id);
      if (oldErr) throw friendlyError(oldErr);
      const oldItems = oldRows.map(saleItemFromRow);

      const { data, error } = await db.from('sales').update(row).eq('id', sale.id).select().single();
      if (error) throw friendlyError(error);
      savedHeader = saleFromRow(data);

      await releaseSaleItemEffects(oldItems);
      const { error: delErr } = await db.from('sale_items').delete().eq('sale_id', sale.id);
      if (delErr) throw friendlyError(delErr);
    } else {
      const { data, error } = await db.from('sales').insert(row).select().single();
      if (error) throw friendlyError(error);
      savedHeader = saleFromRow(data);
    }

    const itemRows = items.map((item) => saleItemToRow({ ...item, saleId: savedHeader.id }));
    const { data: insertedItems, error: insertErr } = await db.from('sale_items').insert(itemRows).select();
    if (insertErr) throw friendlyError(insertErr);

    await applySaleItemEffects(items);

    savedHeader.items = insertedItems.map(saleItemFromRow);
    return savedHeader;
  }

  async function deleteSale(id) {
    const { data: itemRows, error: itemErr } = await db.from('sale_items').select('*').eq('sale_id', id);
    if (itemErr) throw friendlyError(itemErr);
    const items = itemRows.map(saleItemFromRow);

    const { error } = await db.from('sales').delete().eq('id', id);
    if (error) throw friendlyError(error);

    await releaseSaleItemEffects(items);
  }

  window.Storage = {
    getCars, getCar, saveCar, deleteCar, uploadCarPhoto, deleteCarPhoto,
    getParts, getPart, savePart, deletePart,
    getSales, getSale, saveSale, deleteSale,
  };
})();
