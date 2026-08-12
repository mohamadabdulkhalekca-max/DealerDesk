/** Small formatting/DOM helpers shared across views. */
(function () {
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    // Manual "$" prefix instead of Intl's currency style — some locales
    // render that as "USD 2,500" or "US$2,500" instead of plain "$2,500".
    const sign = n < 0 ? '-' : '';
    return `${sign}$${Math.round(Math.abs(n)).toLocaleString(undefined)}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function saleProfit(sale, cars) {
    const car = cars.find((c) => c.id === sale.carId);
    if (!car) return 0;
    const cost = Number(car.purchasePrice || 0) + Number(car.additionalCosts || 0);
    return Number(sale.salePrice || 0) - cost;
  }

  function emptyState(message) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = message;
    return div;
  }

  function statusLabel(status) {
    return { in_stock: 'In Stock', reserved: 'Reserved', sold: 'Sold' }[status] || status;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function currentMonthLocal() {
    return todayLocal().slice(0, 7);
  }

  function formatMonthLabel(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  function formatDayLabel(dayValue) {
    const [year, month, day] = dayValue.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Native <input type="month"> has no picker UI in Safari, so month
  // selection is built from plain <select>s instead — this supplies the
  // year range for that dropdown, widened to cover any dates passed in.
  function yearOptionsForDates(dateStrings) {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear - 5;
    let maxYear = currentYear;
    dateStrings.forEach((d) => {
      if (!d) return;
      const y = Number(d.slice(0, 4));
      if (y < minYear) minYear = y;
      if (y > maxYear) maxYear = y;
    });
    const years = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }

  // Inline SVG icons for compact row-action buttons — no icon font/CDN
  // dependency. currentColor lets each button's text color (e.g. the
  // red on .danger buttons) tint the icon automatically.
  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    receipt: `<svg ${ICON_ATTRS}><path d="M6 2h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V2z"/><line x1="8.5" y1="7" x2="15.5" y2="7"/><line x1="8.5" y1="11" x2="15.5" y2="11"/><line x1="8.5" y1="15" x2="12.5" y2="15"/></svg>`,
    edit: `<svg ${ICON_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    delete: `<svg ${ICON_ATTRS}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    sell: `<svg ${ICON_ATTRS}><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>`,
    flyer: `<svg ${ICON_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.7"/><path d="M21 15l-5.5-5.5a1 1 0 0 0-1.4 0L5 19"/></svg>`,
  };

  function iconButton(iconName, label, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = extraClass ? `icon-btn ${extraClass}` : 'icon-btn';
    btn.innerHTML = icons[iconName];
    btn.title = label;
    btn.setAttribute('aria-label', label);
    return btn;
  }

  function toCsv(rows, columns) {
    const escapeCell = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map((c) => escapeCell(c.label)).join(',');
    const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
    return [header, ...lines].join('\r\n');
  }

  function downloadCsv(filename, csvText) {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  window.Helpers = {
    formatCurrency, escapeHtml, saleProfit, emptyState, statusLabel,
    todayLocal, currentMonthLocal, formatMonthLabel, formatDayLabel,
    MONTH_NAMES, yearOptionsForDates, iconButton, toCsv, downloadCsv,
  };
})();
