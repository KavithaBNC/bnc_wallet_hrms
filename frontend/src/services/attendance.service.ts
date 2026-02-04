import api from './api';

export interface BiometricSyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { employeeCode: string; date: string; message: string }[];
}

export const attendanceService = {
  /**
   * Sync attendance from eSSL biometric / eSSL Cloud API.
   * Requires HR_MANAGER, ORG_ADMIN, or SUPER_ADMIN.
   */
  syncBiometric: async (
    organizationId: string,
    fromDate: string,
    toDate: string
  ): Promise<BiometricSyncResult> => {
    const { data } = await api.post<{ data: BiometricSyncResult }>(
      '/attendance/sync/biometric',
      { organizationId, fromDate, toDate }
    );
    return data.data;
  },
};
