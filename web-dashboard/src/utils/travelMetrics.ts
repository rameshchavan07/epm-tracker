/**
 * Calculates distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export interface RouteTelemetryMetrics {
  totalDistanceKm: number;
  formattedDuration: string;
  visitedLocationsCount: number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

/**
 * Computes Total Distance, Travel Duration, and Visited Locations from breadcrumb logs.
 */
export const calculateRouteMetrics = (
  historyLogs: LocationPoint[]
): RouteTelemetryMetrics => {
  if (!historyLogs || historyLogs.length === 0) {
    return {
      totalDistanceKm: 0,
      formattedDuration: '0m',
      visitedLocationsCount: 0,
    };
  }

  if (historyLogs.length === 1) {
    return {
      totalDistanceKm: 0,
      formattedDuration: '0m',
      visitedLocationsCount: 1,
    };
  }

  // 1. Calculate Total Distance
  let totalDistanceKm = 0;
  for (let i = 0; i < historyLogs.length - 1; i++) {
    const dist = calculateHaversineDistanceKm(
      historyLogs[i].lat,
      historyLogs[i].lng,
      historyLogs[i + 1].lat,
      historyLogs[i + 1].lng
    );
    totalDistanceKm += dist;
  }

  // 2. Calculate Travel Duration
  const startTime = new Date(historyLogs[0].recordedAt).getTime();
  const endTime = new Date(historyLogs[historyLogs.length - 1].recordedAt).getTime();
  const diffMs = Math.max(0, endTime - startTime);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  let formattedDuration = '';
  if (hours > 0) {
    formattedDuration = `${hours}h ${mins}m`;
  } else {
    formattedDuration = `${mins}m`;
  }

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    formattedDuration,
    visitedLocationsCount: historyLogs.length,
  };
};
