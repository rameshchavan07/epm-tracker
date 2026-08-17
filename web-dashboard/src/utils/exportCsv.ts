export interface ExportableEmployeeRecord {
  id?: string;
  deviceId?: string;
  device_id?: string;
  employee_code?: string;
  userId?: string;
  name?: string;
  role?: string;
  status?: string;
  battery?: number;
  recorded_date_time?: string;
  lat?: number;
  lng?: number;
  address?: string | null;
}

export const exportTeamAttendanceCsv = (
  records: ExportableEmployeeRecord[],
  filename = 'HRMS_EPM_Team_Attendance_Report.csv'
) => {
  if (!records || records.length === 0) {
    alert('No employee data available to export.');
    return;
  }

  const headers = ['Employee Code / Name', 'Device ID', 'Role', 'Status', 'Location Address', 'Last Latitude', 'Last Longitude', 'Last Recorded Time'];

  const rows = records.map((emp) => [
    `"${(emp.employee_code || emp.name || emp.userId || emp.id || 'Field Agent').toString().replace(/"/g, '""')}"`,
    `"${(emp.device_id || emp.deviceId || emp.id || 'N/A').toString().replace(/"/g, '""')}"`,
    `"${(emp.role || 'Field Agent').toString().replace(/"/g, '""')}"`,
    `"${(emp.status || 'Offline').toString().replace(/"/g, '""')}"`,
    `"${(emp.address || 'N/A').toString().replace(/"/g, '""')}"`,
    emp.lat !== undefined && emp.lat !== null ? emp.lat : 'N/A',
    emp.lng !== undefined && emp.lng !== null ? emp.lng : 'N/A',
    emp.recorded_date_time ? `"${new Date(emp.recorded_date_time).toLocaleString()}"` : `"${new Date().toLocaleString()}"`,
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
