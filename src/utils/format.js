const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always', // 1.250,50 € (sin esto, es-ES no agrupa los miles de 4 cifras)
});

export const formatCurrency = (value) => currency.format(Number(value) || 0);

export function formatSigned(type, amount) {
  return `${type === 'income' ? '+' : '-'}${formatCurrency(amount)}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// "Hoy, 14:32" · "Ayer" · "15 ago"
export function formatMovementDate(iso) {
  const date = new Date(iso);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);

  if (diffDays === 0) {
    return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}