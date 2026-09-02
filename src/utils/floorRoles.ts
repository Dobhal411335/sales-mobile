const SALES_ADMIN_ROLES = new Set(['ADMIN', 'SUPER ADMIN']);

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
