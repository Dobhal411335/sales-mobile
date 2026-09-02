export type EmployeePermission =
  | 'CREATE_ORDER'
  | 'EDIT_ORDER'
  | 'CANCEL_ORDER'
  | 'APPLY_DISCOUNT'
  | 'KITCHEN_ACCESS'
  | 'VIEW_REPORTS'
  | 'MANAGE_SETTINGS'
  | 'PROCESS_REFUND'
  | 'CREATE_TABLE'
  | 'VIEW_DASHBOARD';

export interface EmployeeProfile {
  _id: string;
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  restaurant: string;
  joinDate?: string;
  profileImage?: string;
  tipPercent: number;
  receiveOwnTips: boolean;
  permissions: EmployeePermission[];
}

export interface EmployeeShift {
  id: string;
  startTime: string;
  assignedFloor: string | null;
  assignedSection: string | null;
}

export interface AuthSession {
  employee: EmployeeProfile;
  shift: EmployeeShift | null;
}

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  restaurant: string;
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface PasscodeCredentials {
  passcode: string;
}

export interface ActivateDeviceCredentials {
  employeeId: string;
  password: string;
  activationCode: string;
}

export type LoginResult =
  | {success: true}
  | {success: false; error: string}
  | {success: false; needsActivation: true; error?: string};
