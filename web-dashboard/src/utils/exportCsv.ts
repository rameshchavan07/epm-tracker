export interface ExportableEmployeeRecord {
  id?: string;
  deviceId?: string;
  userId?: string;
  name?: string;
  role?: string;
  status?: string;
  battery?: number;
  recordedAt?: string;
  lat?: number;
  lng?: number;
}

export const exportTeamAttendanceCsv = (
  records: ExportableEmployeeRecord[],
  filename = 'EPM_Team_Attendance_Report.csv'
) => {
  if (!records || records.length === 0) {
    alert('No employee data available to export.');
    return;
  }

  const headers = ['User ID / Name', 'Device Hardware ID', 'Role', 'Status', 'Last Latitude', 'Last Longitude', 'Last Recorded Time'];

  const rows = records.map((emp) => [
    `"${(emp.userId || emp.name || emp.id || 'Field Agent').toString().replace(/"/g, '""')}"`,
    `"${(emp.deviceId || emp.id || 'N/A').toString().replace(/"/g, '""')}"`,
    `"${(emp.role || 'Field Agent').toString().replace(/"/g, '""')}"`,
    `"${(emp.status || 'Offline').toString().replace(/"/g, '""')}"`,
    emp.lat !== undefined && emp.lat !== null ? emp.lat : 'N/A',
    emp.lng !== undefined && emp.lng !== null ? emp.lng : 'N/A',
    emp.recordedAt ? `"${new Date(emp.recordedAt).toLocaleString()}"` : `"${new Date().toLocaleString()}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};
