export interface ExportableEmployeeRecord {
  id: string;
  name: string;
  role: string;
  status: string;
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

  const headers = ['Employee ID', 'Name', 'Role', 'Status', 'Battery Level (%)', 'Last Latitude', 'Last Longitude', 'Last Recorded Time'];

  const rows = records.map((emp) => [
    `"${emp.id}"`,
    `"${emp.name.replace(/"/g, '""')}"`,
    `"${emp.role.replace(/"/g, '""')}"`,
    `"${emp.status}"`,
    emp.battery !== undefined ? emp.battery : 'N/A',
    emp.lat !== undefined ? emp.lat : 'N/A',
    emp.lng !== undefined ? emp.lng : 'N/A',
    emp.recordedAt ? `"${new Date(emp.recordedAt).toLocaleString()}"` : `"${new Date().toLocaleString()}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
