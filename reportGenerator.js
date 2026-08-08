// Clinical Sports Injury Diagnostic Report Generator

export function triggerPrintReport() {
  window.print();
}

export function formatTimestamp(dateStr) {
  if (!dateStr) return new Date().toLocaleString();
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
