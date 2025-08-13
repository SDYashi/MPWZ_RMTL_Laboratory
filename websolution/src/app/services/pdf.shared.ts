import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

export function header(title: string): Content {
  return {
    columns: [
      { image: 'mp-logo', width: 40, margin: [0, -3, 8, 0] },
      { text: title, style: 'h1', margin: [0, 0, 0, 2] }
    ],
  };
}

export function footer(): TDocumentDefinitions['footer'] {
  return (currentPage, pageCount) => ({
    margin: [40, 8, 40, 0],
    columns: [
      { text: 'RMTL Indore • Auto-generated', opacity: 0.7 },
      { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', opacity: 0.7 }
    ]
  });
}

export const baseDoc: Partial<TDocumentDefinitions> = {
  pageSize: 'A4',
  pageMargins: [40, 60, 40, 60],
  styles: {
    h1: { fontSize: 16, bold: true },
    h2: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
    small: { fontSize: 9 }
  },
  images: {
    // Replace with your Base64 (once) to avoid remote fetches
    'mp-logo': '' // 'data:image/png;base64,iVBORw0K...'
  }
};
