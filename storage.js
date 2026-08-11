/**
 * Data layer. Every read/write to persisted data goes through here.
 * Backed by localStorage today; swap the internals for fetch() calls
 * later without changing any calling code.
 */
(function () {
  const KEYS = {
    cars: 'ct_cars',
    sales: 'ct_sales',
    settings: 'ct_settings',
  };

  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      throw new Error(`Could not read data (${key}): ${err.message}`);
    }
  }

  function writeList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      throw new Error(`Could not save data (${key}): ${err.message}`);
    }
  }

  function generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // --- Cars ---

  function getCars() {
    return readList(KEYS.cars);
  }

  function getCar(id) {
    return getCars().find((c) => c.id === id) || null;
  }

  function saveCar(car) {
    const cars = getCars();
    let saved;
    if (car.id) {
      const idx = cars.findIndex((c) => c.id === car.id);
      if (idx === -1) throw new Error(`Car not found: ${car.id}`);
      saved = { ...cars[idx], ...car };
      cars[idx] = saved;
    } else {
      saved = { ...car, id: generateId() };
      cars.push(saved);
    }
    writeList(KEYS.cars, cars);
    return saved;
  }

  function deleteCar(id) {
    const hasSale = getSales().some((s) => s.carId === id);
    if (hasSale) {
      throw new Error('This car has a recorded sale — delete the sale first.');
    }
    writeList(KEYS.cars, getCars().filter((c) => c.id !== id));
  }

  // --- Sales ---

  function getSales() {
    return readList(KEYS.sales);
  }

  function getSale(id) {
    return getSales().find((s) => s.id === id) || null;
  }

  function saveSale(sale) {
    const sales = getSales();
    let saved;
    if (sale.id) {
      const idx = sales.findIndex((s) => s.id === sale.id);
      if (idx === -1) throw new Error(`Sale not found: ${sale.id}`);
      saved = { ...sales[idx], ...sale };
      sales[idx] = saved;
    } else {
      saved = { ...sale, id: generateId() };
      sales.push(saved);
      const car = getCar(saved.carId);
      if (car) saveCar({ ...car, status: 'sold' });
    }
    writeList(KEYS.sales, sales);
    return saved;
  }

  function deleteSale(id) {
    writeList(KEYS.sales, getSales().filter((s) => s.id !== id));
  }

  // --- Settings ---

  function getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.settings);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      throw new Error(`Could not read settings: ${err.message}`);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    } catch (err) {
      throw new Error(`Could not save settings: ${err.message}`);
    }
  }

  async function hashPassword(password) {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  window.Storage = {
    getCars, getCar, saveCar, deleteCar,
    getSales, getSale, saveSale, deleteSale,
    getSettings, saveSettings, hashPassword,
  };
})();
