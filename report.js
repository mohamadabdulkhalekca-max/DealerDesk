/**
 * Builds a printable period summary PDF (sales, expenses, net profit) and
 * hands it to the device's share sheet (or downloads it), same pattern as
 * receipt.js / flyer.js.
 */
(function () {
  // Matches the app's CSS palette (styles.css :root), converted to RGB.
  const COLOR_PRIMARY = [30, 41, 59]; // --primary
  const COLOR_PRIMARY_DARK = [15, 23, 42]; // --primary-dark
  const COLOR_TEXT = [15, 23, 42]; // --text
  const COLOR_TEXT_MUTED = [71, 85, 105]; // --text-muted
  const COLOR_BORDER = [226, 232, 240]; // --border
  const COLOR_BOX_BG = [248, 250, 252]; // --bg

  function buildReportDoc(periodLabel, sales, cars, parts, expenses) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 56;
    const rightEdge = pageWidth - marginX;
    const contentWidth = rightEdge - marginX;

    let y = 0;

    function drawHeaderBand() {
      const bandHeight = 76;
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(0, 0, pageWidth, bandHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Dealer Desk', marginX, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text('PERIOD SUMMARY REPORT', marginX, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(periodLabel, rightEdge, 42, { align: 'right' });
      y = bandHeight + 34;
    }

    function ensureSpace(needed) {
      if (y + needed > pageHeight - 50) {
        doc.addPage();
        y = 40;
      }
    }

    function sectionHeader(label) {
      ensureSpace(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_PRIMARY_DARK);
      doc.text(label.toUpperCase(), marginX, y);
      y += 18;
    }

    drawHeaderBand();

    const grossRevenue = sales.reduce((sum, s) => sum + Helpers.saleTotal(s), 0);
    const grossProfit = sales.reduce((sum, s) => sum + Helpers.saleProfit(s, cars, parts), 0);
    const costOfGoods = grossRevenue - grossProfit;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    sectionHeader('Summary');
    const stats = [
      ['Sales Count', String(sales.length)],
      ['Gross Revenue', Helpers.formatCurrency(grossRevenue)],
      ['Cost of Goods', Helpers.formatCurrency(costOfGoods)],
      ['Gross Profit', Helpers.formatCurrency(grossProfit)],
      ['Total Expenses', Helpers.formatCurrency(totalExpenses)],
    ];
    const statColWidth = contentWidth / stats.length;
    stats.forEach(([label, value], idx) => {
      const x = marginX + idx * statColWidth;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(String(value), x, y + 18);
    });
    y += 44;

    const boxHeight = 58;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setFillColor(...COLOR_BOX_BG);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('NET PROFIT (after expenses)', marginX + 20, y + 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(Helpers.formatCurrency(netProfit), rightEdge - 20, y + 38, { align: 'right' });
    y += boxHeight + 30;

    // --- Sales table ---
    sectionHeader(`Sales (${sales.length})`);
    if (sales.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text('No sales in this period.', marginX, y);
      y += 24;
    } else {
      const colDate = marginX;
      const colBuyer = marginX + 70;
      const colItems = marginX + 210;
      const colTotal = rightEdge - 70;
      const colProfit = rightEdge;

      const drawSalesHead = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text('DATE', colDate, y);
        doc.text('BUYER', colBuyer, y);
        doc.text('ITEMS', colItems, y);
        doc.text('TOTAL', colTotal, y, { align: 'right' });
        doc.text('PROFIT', colProfit, y, { align: 'right' });
        y += 8;
        doc.setDrawColor(...COLOR_BORDER);
        doc.line(marginX, y, rightEdge, y);
        y += 16;
      };
      drawSalesHead();

      sales
        .slice()
        .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
        .forEach((s) => {
          ensureSpace(24);
          if (y === 40) drawSalesHead();
          const itemsLabel = Helpers.saleItemsSummary(s, cars, parts);
          const itemsLines = doc.splitTextToSize(itemsLabel, colTotal - colItems - 20);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...COLOR_TEXT);
          doc.text(s.saleDate || '—', colDate, y);
          doc.text(s.buyerName || '—', colBuyer, y);
          doc.text(itemsLines, colItems, y);
          doc.text(Helpers.formatCurrency(Helpers.saleTotal(s)), colTotal, y, { align: 'right' });
          doc.text(Helpers.formatCurrency(Helpers.saleProfit(s, cars, parts)), colProfit, y, { align: 'right' });
          y += Math.max(16, itemsLines.length * 12) + 8;
        });
      y += 16;
    }

    // --- Expenses table ---
    sectionHeader(`Expenses (${expenses.length})`);
    if (expenses.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text('No expenses in this period.', marginX, y);
    } else {
      const colDate = marginX;
      const colCategory = marginX + 70;
      const colDesc = marginX + 170;
      const colAmount = rightEdge;

      const drawExpHead = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text('DATE', colDate, y);
        doc.text('CATEGORY', colCategory, y);
        doc.text('DESCRIPTION', colDesc, y);
        doc.text('AMOUNT', colAmount, y, { align: 'right' });
        y += 8;
        doc.setDrawColor(...COLOR_BORDER);
        doc.line(marginX, y, rightEdge, y);
        y += 16;
      };
      drawExpHead();

      expenses
        .slice()
        .sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate))
        .forEach((e) => {
          ensureSpace(20);
          if (y === 40) drawExpHead();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...COLOR_TEXT);
          doc.text(e.expenseDate || '—', colDate, y);
          doc.text(Helpers.expenseCategoryLabel(e.category), colCategory, y);
          doc.text(e.description || '—', colDesc, y);
          doc.text(Helpers.formatCurrency(e.amount), colAmount, y, { align: 'right' });
          y += 18;
        });
    }

    return doc;
  }

  async function shareReport(periodLabel, sales, cars, parts, expenses) {
    const doc = buildReportDoc(periodLabel, sales, cars, parts, expenses);
    const fileName = `report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    const blob = doc.output('blob');

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Period Summary Report', text: periodLabel });
          return { method: 'share' };
        } catch (err) {
          if (err && err.name === 'AbortError') return { method: 'cancelled' };
        }
      }
    }

    doc.save(fileName);
    return { method: 'download' };
  }

  window.Report = { shareReport };
})();
