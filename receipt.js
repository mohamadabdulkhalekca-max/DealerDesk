/**
 * Builds a one-page PDF sale receipt and hands it to the device's share
 * sheet (Web Share API) when available, falling back to a direct download.
 */
(function () {
  function carLine(car) {
    if (!car) return 'Unknown vehicle';
    return `${car.year} ${car.make} ${car.model}`;
  }

  // Matches the app's CSS palette (styles.css :root), converted to RGB.
  const COLOR_PRIMARY = [204, 75, 23]; // --primary
  const COLOR_PRIMARY_DARK = [166, 59, 17]; // --primary-dark
  const COLOR_TEXT = [33, 28, 23]; // --text
  const COLOR_TEXT_MUTED = [117, 108, 96]; // --text-muted
  const COLOR_BORDER = [229, 221, 208]; // --border
  const COLOR_BOX_BG = [247, 244, 239]; // --bg

  function buildReceiptDoc(sale, car) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 56;
    const rightEdge = pageWidth - marginX;
    const contentWidth = rightEdge - marginX;

    // Header band
    const bandHeight = 88;
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 0, pageWidth, bandHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Car Trader Manager', marginX, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('VEHICLE SALE RECEIPT', marginX, 60);

    const receiptNo = sale.id ? sale.id.slice(0, 8).toUpperCase() : '—';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Receipt #${receiptNo}`, rightEdge, 42, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(sale.saleDate || '—', rightEdge, 58, { align: 'right' });

    const colGap = 24;
    const colWidth = (contentWidth - colGap) / 2;
    const leftX = marginX;
    const rightX = marginX + colWidth + colGap;

    let y = bandHeight + 44;
    const startY = y;

    const sectionHeader = (x, label) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_PRIMARY_DARK);
      doc.text(label.toUpperCase(), x, y);
      y += 18;
    };

    const row = (x, label, value) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(String(value === undefined || value === null || value === '' ? '—' : value), x, y + 15);
      y += 36;
    };

    sectionHeader(leftX, 'Vehicle');
    row(leftX, 'Vehicle', carLine(car));
    row(leftX, 'VIN', car && car.vin);
    row(leftX, 'Color', car && car.color);
    row(leftX, 'Mileage', car && car.mileage ? `${Number(car.mileage).toLocaleString()} mi` : null);
    const leftEndY = y;

    y = startY;
    sectionHeader(rightX, 'Buyer');
    row(rightX, 'Name', sale.buyerName);
    row(rightX, 'Contact', sale.buyerContact);
    row(rightX, 'Payment Status', sale.paymentStatus === 'paid' ? 'Paid' : 'Pending');
    const rightEndY = y;

    y = Math.max(leftEndY, rightEndY) + 4;

    if (sale.notes) {
      sectionHeader(leftX, 'Notes');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT);
      const lines = doc.splitTextToSize(sale.notes, contentWidth);
      doc.text(lines, leftX, y);
      y += lines.length * 14 + 20;
    } else {
      y += 8;
    }

    // Total box
    const boxHeight = 58;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setFillColor(...COLOR_BOX_BG);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('TOTAL SALE PRICE', marginX + 20, y + 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(Helpers.formatCurrency(sale.salePrice), rightEdge - 20, y + 38, { align: 'right' });

    y += boxHeight + 34;

    doc.setDrawColor(...COLOR_BORDER);
    doc.line(marginX, y, rightEdge, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('Thank you for your business.', marginX, y);
    doc.text(`Generated ${new Date().toLocaleString()}`, rightEdge, y, { align: 'right' });

    return doc;
  }

  async function shareReceipt(sale, car) {
    const doc = buildReceiptDoc(sale, car);
    const fileName = `receipt-${(sale.id || 'sale').slice(0, 8)}.pdf`;
    const blob = doc.output('blob');

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Sale Receipt',
            text: `Receipt for ${carLine(car)}`,
          });
          return { method: 'share' };
        } catch (err) {
          if (err && err.name === 'AbortError') return { method: 'cancelled' };
          // Fall through to download if sharing fails for any other reason.
        }
      }
    }

    doc.save(fileName);
    return { method: 'download' };
  }

  window.Receipt = { shareReceipt };
})();
