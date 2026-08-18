/**
 * Builds a one-page itemized PDF sale receipt (cars and/or parts) and
 * hands it to the device's share sheet (Web Share API) when available,
 * falling back to a direct download.
 */
(function () {
  // Matches the app's CSS palette (styles.css :root), converted to RGB.
  const COLOR_PRIMARY = [30, 41, 59]; // --primary
  const COLOR_PRIMARY_DARK = [15, 23, 42]; // --primary-dark
  const COLOR_TEXT = [15, 23, 42]; // --text
  const COLOR_TEXT_MUTED = [71, 85, 105]; // --text-muted
  const COLOR_BORDER = [226, 232, 240]; // --border
  const COLOR_BOX_BG = [248, 250, 252]; // --bg

  function buildReceiptDoc(sale, cars, parts) {
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
    doc.text('SALE RECEIPT', marginX, 60);

    const receiptNo = sale.id ? sale.id.slice(0, 8).toUpperCase() : '—';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Receipt #${receiptNo}`, rightEdge, 42, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(sale.saleDate || '—', rightEdge, 58, { align: 'right' });

    let y = bandHeight + 40;

    const sectionHeader = (label) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_PRIMARY_DARK);
      doc.text(label.toUpperCase(), marginX, y);
      y += 18;
    };

    const row = (label, value) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(label, marginX, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(String(value === undefined || value === null || value === '' ? '—' : value), marginX + 130, y);
      y += 20;
    };

    sectionHeader('Buyer');
    row('Name', sale.buyerName);
    row('Contact', sale.buyerContact);
    row('Payment Status', sale.paymentStatus === 'paid' ? 'Paid' : 'Pending');
    y += 10;

    sectionHeader('Items');

    const colItem = marginX;
    const colQty = rightEdge - 220;
    const colPrice = rightEdge - 140;
    const colTotal = rightEdge;
    const itemColWidth = colQty - colItem - 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('ITEM', colItem, y);
    doc.text('QTY', colQty, y, { align: 'right' });
    doc.text('UNIT PRICE', colPrice, y, { align: 'right' });
    doc.text('LINE TOTAL', colTotal, y, { align: 'right' });
    y += 8;
    doc.setDrawColor(...COLOR_BORDER);
    doc.line(marginX, y, rightEdge, y);
    y += 16;

    const items = sale.items || [];
    items.forEach((item) => {
      const label = Helpers.itemLabel(item, cars, parts);
      const qty = item.quantity || 1;
      const lineTotal = Number(item.unitPrice || 0) * qty;
      const labelLines = doc.splitTextToSize(label, itemColWidth);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(labelLines, colItem, y);
      doc.text(String(qty), colQty, y, { align: 'right' });
      doc.text(Helpers.formatCurrency(item.unitPrice), colPrice, y, { align: 'right' });
      doc.text(Helpers.formatCurrency(lineTotal), colTotal, y, { align: 'right' });
      y += Math.max(16, labelLines.length * 13) + 6;
    });

    y += 4;
    doc.setDrawColor(...COLOR_BORDER);
    doc.line(marginX, y, rightEdge, y);
    y += 24;

    if (sale.notes) {
      sectionHeader('Notes');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT);
      const lines = doc.splitTextToSize(sale.notes, contentWidth);
      doc.text(lines, marginX, y);
      y += lines.length * 14 + 20;
    } else {
      y += 4;
    }

    // Total box
    const boxHeight = 58;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setFillColor(...COLOR_BOX_BG);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('TOTAL', marginX + 20, y + 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(Helpers.formatCurrency(Helpers.saleTotal(sale)), rightEdge - 20, y + 38, { align: 'right' });

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

  async function shareReceipt(sale, cars, parts) {
    const doc = buildReceiptDoc(sale, cars, parts);
    const fileName = `receipt-${(sale.id || 'sale').slice(0, 8)}.pdf`;
    const blob = doc.output('blob');

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Sale Receipt',
            text: `Receipt for ${sale.buyerName}`,
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
