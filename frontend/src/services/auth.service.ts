import { api, setAccessToken } from './api';
import { TokenResponse, SetupStatus, Settings } from '@/types';

export const authService = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const data = await api<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
    }
  },

  async getSetupStatus(): Promise<SetupStatus> {
    return api<SetupStatus>('/api/v1/setup/status');
  },

  async completeSetup(data: {
    language: string;
    instanceName: string;
    timezone: string;
    adminUsername: string;
    adminPassword: string;
  }): Promise<Settings> {
    return api<Settings>('/api/v1/setup/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
