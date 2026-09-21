export const escapeCsvValue = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function downloadCsvUtf8(filename, rows) {
  const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
