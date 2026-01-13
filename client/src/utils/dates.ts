export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDefaultDateRange() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return {
    from: formatDate(today),
    to: formatDate(nextWeek),
  };
}

export function getDaysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    days.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}
