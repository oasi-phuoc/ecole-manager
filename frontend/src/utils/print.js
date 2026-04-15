export function getForcedPrintCss(pageSize = 'A4 portrait', margin = '10mm') {
  return `
    @page { size: ${pageSize}; margin: ${margin}; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    @media print {
      html, body {
        width: 100%;
        height: auto;
        overflow: visible !important;
        background: white !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;
}

export function injectForcedPrintCss(htmlDocument, pageSize = 'A4 portrait', margin = '10mm') {
  const css = getForcedPrintCss(pageSize, margin);
  if (!htmlDocument || typeof htmlDocument !== 'string') return htmlDocument;
  if (htmlDocument.includes('</head>')) {
    return htmlDocument.replace('</head>', `<style>${css}</style></head>`);
  }
  return `<style>${css}</style>${htmlDocument}`;
}

export function openPrintPopup(htmlDocument, options = {}) {
  const { title = 'Impression', width = 1100, height = 820 } = options;
  const popup = window.open('', '_blank', `width=${width},height=${height}`);
  if (!popup) return null;
  popup.document.write(htmlDocument);
  popup.document.title = title;
  popup.document.close();
  popup.onload = () => {
    popup.focus();
    popup.print();
  };
  return popup;
}
