import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface OnlineStaffMember {
  id: string;
  name: string;
  role: string;
  employeeId: string;
  loginTime: string;
}

export interface OnlineStaffSnapshot {
  count: number;
  online: OnlineStaffMember[];
}

const useLiveApi = Boolean(config.API_BASE_URL);

export async function fetchOnlineStaff(): Promise<OnlineStaffSnapshot> {
  if (!useLiveApi) {
    return {count: 0, online: []};
  }

  try {
    const response = await api.get<ApiEnvelope<OnlineStaffSnapshot>>(
      '/api/sales/online',
    );
    if (!response.data?.success || !response.data.data) {
      return {count: 0, online: []};
    }
    return {
      count: response.data.data.count || 0,
      online: response.data.data.online || [],
    };
  } catch (error) {
    if (isAxiosError(error) && !error.response) {
      return {count: 0, online: []};
    }
    return {count: 0, online: []};
  }
}

export async function fetchOnlineStaffCount(): Promise<number> {
  const snapshot = await fetchOnlineStaff();
  return snapshot.count;
}
