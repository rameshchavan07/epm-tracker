package com.epm.tracking.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.local.AppDatabase

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)

        return try {
            val unsyncedLocations = database.locationDao().getUnsyncedLocations()
            if (unsyncedLocations.isEmpty()) {
                return Result.success()
            }

            val apiService = ApiClient.getService()
            val batchRequest = unsyncedLocations.map { loc ->
                LocationBatchRequest(
                    employeeCode = loc.employeeCode,
                    latitude     = loc.latitude,
                    longitude    = loc.longitude,
                    accuracy     = loc.accuracy,
                    address      = loc.address,
                    timestamp    = loc.timestamp
                )
            }

            val response = apiService.syncLocations(batchRequest)
            if (response.success) {
                database.locationDao().deleteLocations(unsyncedLocations.map { it.id })
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}
