import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface OnlineStaffData {
  count: number;
  online: Array<{
    id: string;
    name: string;
    role: string;
    employeeId: string;
    loginTime: string;
  }>;
}

const useLiveApi = Boolean(config.API_BASE_URL);

export async function fetchOnlineStaffCount(): Promise<number> {
  if (!useLiveApi) {
    return 0;
  }

  try {
    const response = await api.get<ApiEnvelope<OnlineStaffData>>(
      '/api/sales/online',
    );
    if (!response.data?.success || !response.data.data) {
      return 0;
    }
    return response.data.data.count || 0;
  } catch (error) {
    if (isAxiosError(error) && !error.response) {
      return 0;
    }
    return 0;
  }
}
