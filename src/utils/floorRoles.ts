const SALES_ADMIN_ROLES = new Set(['ADMIN', 'SUPER ADMIN']);

const PRINTER_MANAGER_ROLES = new Set([
  'ADMIN',
  'SUPER ADMIN',
  'MANAGER',
  'MASTER TERMINAL',
  'MANAGER TERMINAL',
]);

export function isSalesAdminRole(role?: string | null): boolean {
  if (!role) {
    return false;
  }
  return SALES_ADMIN_ROLES.has(String(role).trim().toUpperCase());
}

export function canOverrideFloorSession(role?: string | null): boolean {
  const normalized = String(role ?? '').trim().toUpperCase();
  return isSalesAdminRole(role) || normalized === 'MANAGER';
}

/** Admin/Manager roles that may configure restaurant printers. */
export function canManagePrinters(role?: string | null): boolean {
  if (!role) {
    return false;
  }
  return PRINTER_MANAGER_ROLES.has(String(role).trim().toUpperCase());
}

export function isStaffRole(role?: string | null): boolean {
  if (!role) {
    return false;
  }
  return String(role).trim().toUpperCase() === 'STAFF';
}

