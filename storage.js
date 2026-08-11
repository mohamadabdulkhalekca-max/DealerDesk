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
      purchaseDate: row.purchase_date,
      status: row.status,
      notes: row.notes,
      photoUrl: row.photo_url,
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
    if (car.purchaseDate !== undefined) row.purchase_date = car.purchaseDate || null;
    if (car.status !== undefined) row.status = car.status;
    if (car.notes !== undefined) row.notes = car.notes || null;
    if (car.photoUrl !== undefined) row.photo_url = car.photoUrl || null;
    return row;
  }

  function saleFromRow(row) {
    return {
      id: row.id,
      carId: row.car_id,
      buyerName: row.buyer_name,
      buyerContact: row.buyer_contact,
      salePrice: row.sale_price,
      saleDate: row.sale_date,
      paymentStatus: row.payment_status,
      notes: row.notes,
    };
  }

  function saleToRow(sale) {
    const row = {};
    if (sale.carId !== undefined) row.car_id = sale.carId;
    if (sale.buyerName !== undefined) row.buyer_name = sale.buyerName;
    if (sale.buyerContact !== undefined) row.buyer_contact = sale.buyerContact || null;
    if (sale.salePrice !== undefined) row.sale_price = sale.salePrice;
    if (sale.saleDate !== undefined) row.sale_date = sale.saleDate || null;
    if (sale.paymentStatus !== undefined) row.payment_status = sale.paymentStatus;
    if (sale.notes !== undefined) row.notes = sale.notes || null;
    return row;
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
    const { error } = await db.from('cars').delete().eq('id', id);
    if (error) {
      throw friendlyError(error, 'This car has a recorded sale — delete the sale first.');
    }
  }

  async function uploadCarPhoto(file) {
    const {
      data: { session },
    } = await db.auth.getSession();
    const userId = session && session.user && session.user.id;
    if (!userId) throw new Error('You must be signed in to upload a photo.');

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage
      .from('car-photos')
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = db.storage.from('car-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  // --- Sales ---

  async function getSales() {
    const { data, error } = await db.from('sales').select('*').order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return data.map(saleFromRow);
  }

  async function getSale(id) {
    const { data, error } = await db.from('sales').select('*').eq('id', id).maybeSingle();
    if (error) throw friendlyError(error);
    return data ? saleFromRow(data) : null;
  }

  async function saveSale(sale) {
    const row = saleToRow(sale);
    if (sale.id) {
      const { data, error } = await db.from('sales').update(row).eq('id', sale.id).select().single();
      if (error) throw friendlyError(error);
      return saleFromRow(data);
    }
    const { data, error } = await db.from('sales').insert(row).select().single();
    if (error) throw friendlyError(error);
    const saved = saleFromRow(data);
    await saveCar({ id: saved.carId, status: 'sold' });
    return saved;
  }

  async function deleteSale(id) {
    const { error } = await db.from('sales').delete().eq('id', id);
    if (error) throw friendlyError(error);
  }

  window.Storage = {
    getCars, getCar, saveCar, deleteCar, uploadCarPhoto,
    getSales, getSale, saveSale, deleteSale,
  };
})();
