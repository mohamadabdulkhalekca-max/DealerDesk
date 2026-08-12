/**
 * Builds a one-page "for sale" listing PDF for a car still in stock —
 * photo, price, and key specs — and hands it to the device's share sheet
 * (or downloads it), same pattern as receipt.js.
 */
(function () {
  const COLOR_PRIMARY = [204, 75, 23];
  const COLOR_PRIMARY_DARK = [166, 59, 17];
  const COLOR_TEXT = [33, 28, 23];
  const COLOR_TEXT_MUTED = [117, 108, 96];
  const COLOR_BORDER = [229, 221, 208];

  function carTitle(car) {
    return `${car.year} ${car.make} ${car.model}`;
  }

  // Fetches a (same-origin-CORS-permitting) image URL and returns a data
  // URL jsPDF can embed. Supabase's public storage responses allow
  // cross-origin reads, but this can still fail (network, format) — the
  // caller treats failure as "build the flyer without a photo".
  async function loadImageAsDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load photo (${res.status})`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read photo'));
      reader.readAsDataURL(blob);
    });
  }

  function imageFormatFromDataUrl(dataUrl) {
    const match = /^data:image\/(\w+);/.exec(dataUrl);
    const type = match ? match[1].toUpperCase() : 'JPEG';
    return type === 'JPG' ? 'JPEG' : type;
  }

  async function buildFlyerDoc(car) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 56;
    const rightEdge = pageWidth - marginX;
    const contentWidth = rightEdge - marginX;

    const bandHeight = 70;
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 0, pageWidth, bandHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Car Trader Manager', marginX, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('VEHICLE FOR SALE', marginX, 48);

    let y = bandHeight + 36;

    if (car.photoUrls && car.photoUrls.length) {
      try {
        const dataUrl = await loadImageAsDataUrl(car.photoUrls[0]);
        const format = imageFormatFromDataUrl(dataUrl);
        const props = doc.getImageProperties(dataUrl);
        const maxW = contentWidth;
        const maxH = 300;
        let w = maxW;
        let h = (props.height / props.width) * w;
        if (h > maxH) {
          h = maxH;
          w = (props.width / props.height) * h;
        }
        const x = marginX + (contentWidth - w) / 2;
        doc.addImage(dataUrl, format, x, y, w, h);
        y += h + 28;
      } catch (err) {
        // No photo embedded — flyer still works fine without one.
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(carTitle(car), marginX, y);
    y += 36;

    // Never fall back to purchasePrice here — that's the trader's cost,
    // not a price a buyer should ever see. Asking price is a separate,
    // optional field the trader sets explicitly for listings like this.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    const priceText =
      car.askingPrice != null && car.askingPrice !== ''
        ? Helpers.formatCurrency(car.askingPrice)
        : 'Contact for Price';
    doc.text(priceText, marginX, y);
    y += 46;

    const specs = [
      ['Color', car.color],
      ['Mileage', car.mileage ? `${Number(car.mileage).toLocaleString()} mi` : null],
      ['Year', car.year],
    ].filter(([, v]) => v);

    doc.setDrawColor(...COLOR_BORDER);
    doc.line(marginX, y, rightEdge, y);
    y += 24;

    const colWidth = contentWidth / specs.length;
    specs.forEach(([label, value], idx) => {
      const x = marginX + idx * colWidth;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(String(value), x, y + 18);
    });
    y += 50;

    if (car.notes) {
      doc.setDrawColor(...COLOR_BORDER);
      doc.line(marginX, y, rightEdge, y);
      y += 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT);
      const lines = doc.splitTextToSize(car.notes, contentWidth);
      doc.text(lines, marginX, y);
    }

    return doc;
  }

  async function shareFlyer(car) {
    const doc = await buildFlyerDoc(car);
    const fileName = `for-sale-${(car.id || 'car').slice(0, 8)}.pdf`;
    const blob = doc.output('blob');

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Vehicle For Sale', text: carTitle(car) });
          return { method: 'share' };
        } catch (err) {
          if (err && err.name === 'AbortError') return { method: 'cancelled' };
        }
      }
    }

    doc.save(fileName);
    return { method: 'download' };
  }

  window.Flyer = { shareFlyer };
})();
