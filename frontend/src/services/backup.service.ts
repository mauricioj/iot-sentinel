import { getAccessToken } from './api';

export const backupService = {
  async exportBackup(password: string): Promise<Blob> {
    const res = await fetch('/api/v1/backup/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.blob();
  },

  async restore(file: File, password: string): Promise<{ imported: Record<string, number> }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    const res = await fetch('/api/v1/backup/restore', {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Restore failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  },

};
