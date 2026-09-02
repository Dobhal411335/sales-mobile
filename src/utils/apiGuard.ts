import {config} from '../constants/config';

export function getApiNotConfiguredMessage(): string {
  return 'Backend URL is not configured. Set API_BASE_URL in src/constants/apiConfig.ts.';
}

export function isApiConfigured(): boolean {
  return Boolean(config.API_BASE_URL);
}
