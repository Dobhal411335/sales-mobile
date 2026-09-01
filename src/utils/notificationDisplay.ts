import type {Notification} from '../types/notification';

export function formatClockTime(date?: string | null): string {
  if (!date) {
    return '';
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
}

export function notificationMetaLine(n: Notification): string {
  const parts: string[] = [];
  if (n.metadata?.employeeName) {
    parts.push(
      n.metadata.employeeRole
        ? `${n.metadata.employeeName} · ${n.metadata.employeeRole}`
        : n.metadata.employeeName,
    );
  }
  if (n.metadata?.orderNumber) {
    parts.push(`Order #${n.metadata.orderNumber}`);
  }
  if (n.metadata?.tableNo) {
    const table = String(n.metadata.tableNo).trim();
    parts.push(/^tables?\b/i.test(table) ? table : `Table ${table}`);
  }
  return parts.join(' • ');
}

function employeeActivityTimeLabel(n: Notification): string | null {
  if (n.type === 'EMPLOYEE_LOGIN') {
    const at = n.metadata?.loginTime || n.createdAt;
    return at ? `Clocked in at ${formatClockTime(at)}` : null;
  }
  if (n.type === 'EMPLOYEE_LOGOUT') {
    const at = n.metadata?.logoutTime || n.createdAt;
    return at ? `Clocked out at ${formatClockTime(at)}` : null;
  }
  return null;
}

export function notificationMessageLine(n: Notification): string {
  const activityTime = employeeActivityTimeLabel(n);
  if (n.type === 'EMPLOYEE_LOGIN') {
    return activityTime || n.message;
  }
  if (n.type === 'EMPLOYEE_LOGOUT') {
    const duration = n.metadata?.durationLabel;
    return [activityTime, duration ? `On shift ${duration}` : null]
      .filter(Boolean)
      .join(' · ');
  }
  return n.message;
}

export function notificationTimeLabel(n: Notification): string | null {
  if (n.type === 'EMPLOYEE_LOGIN') {
    return formatClockTime(n.metadata?.loginTime || n.createdAt);
  }
  if (n.type === 'EMPLOYEE_LOGOUT') {
    return formatClockTime(n.metadata?.logoutTime || n.createdAt);
  }
  return null;
}

export function relativeTime(date?: string | null): string {
  if (!date) {
    return '';
  }
  const d = new Date(date);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) {
    return 'just now';
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)} min ago`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }
  if (diff < 172800) {
    return 'Yesterday';
  }
  return d.toLocaleDateString();
}

export function displayNotificationTime(n: Notification): string {
  return notificationTimeLabel(n) || relativeTime(n.createdAt);
}

export function categoryIcon(category?: string): string {
  switch (category) {
    case 'Orders':
      return '🛒';
    case 'Payments':
      return '💳';
    case 'Tables':
      return '▦';
    case 'Employees':
      return '👤';
    case 'System':
    default:
      return '⚙️';
  }
}
