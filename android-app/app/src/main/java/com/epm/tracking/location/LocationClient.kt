package com.epm.tracking.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.Looper
import com.google.android.gms.location.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

interface LocationClient {
    fun getLocationUpdates(interval: Long): Flow<Location>
    class LocationException(message: String): Exception(message)
}

class DefaultLocationClient(
    private val context: Context,
    private val client: FusedLocationProviderClient
): LocationClient {

    @SuppressLint("MissingPermission")
    override fun getLocationUpdates(interval: Long): Flow<Location> {
        return callbackFlow {
            if (!context.hasLocationPermission()) {
                throw LocationClient.LocationException("Missing location permission")
            }

            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val isLocationEnabled = androidx.core.location.LocationManagerCompat.isLocationEnabled(locationManager) ||
                                   locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                                   locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

            if (!isLocationEnabled) {
                throw LocationClient.LocationException("GPS is disabled")
            }

            // Emit last known location only if fresh (< 60s) and accurate (<= 40m)
            client.lastLocation.addOnSuccessListener { lastLoc ->
                if (lastLoc != null) {
                    val isFresh = (System.currentTimeMillis() - lastLoc.time) < 60_000L
                    val isAccurate = !lastLoc.hasAccuracy() || lastLoc.accuracy <= 40f
                    if (isFresh && isAccurate) {
                        trySend(lastLoc)
                    }
                }
            }

            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, interval)
                .setMinUpdateIntervalMillis(2000L)
                .setMinUpdateDistanceMeters(3f)
                .setGranularity(Granularity.GRANULARITY_FINE)
                .setWaitForAccurateLocation(true)
                .build()

            val locationCallback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    super.onLocationResult(result)
                    result.locations.lastOrNull()?.let { location ->
                        if (!location.hasAccuracy() || location.accuracy <= 40f) {
                            trySend(location)
                        }
                    }
                }
            }

            client.requestLocationUpdates(
                request,
                locationCallback,
                Looper.getMainLooper()
            )

            awaitClose {
                client.removeLocationUpdates(locationCallback)
            }
        }
    }
}

fun Context.hasLocationPermission(): Boolean {
    return androidx.core.content.ContextCompat.checkSelfPermission(
        this,
        android.Manifest.permission.ACCESS_FINE_LOCATION
    ) == android.content.pm.PackageManager.PERMISSION_GRANTED &&
    androidx.core.content.ContextCompat.checkSelfPermission(
        this,
        android.Manifest.permission.ACCESS_COARSE_LOCATION
    ) == android.content.pm.PackageManager.PERMISSION_GRANTED
}

@SuppressLint("MissingPermission")
suspend fun Context.getOneTimeLocation(): Pair<Double, Double>? {
    return try {
        if (!hasLocationPermission()) return null
        val fusedClient = LocationServices.getFusedLocationProviderClient(this)
        withTimeoutOrNull(3000L) {
            val lastLoc: Location? = try { fusedClient.lastLocation.await() } catch (_: Exception) { null }
            if (lastLoc != null && (System.currentTimeMillis() - lastLoc.time) < 120_000L) {
                return@withTimeoutOrNull Pair(lastLoc.latitude, lastLoc.longitude)
            }
            val currentLoc: Location? = try {
                fusedClient.getCurrentLocation(
                    Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                    null
                ).await()
            } catch (_: Exception) { null }

            if (currentLoc != null) {
                Pair(currentLoc.latitude, currentLoc.longitude)
            } else if (lastLoc != null) {
                Pair(lastLoc.latitude, lastLoc.longitude)
            } else null
        }
    } catch (_: Exception) {
        null
    }
}

