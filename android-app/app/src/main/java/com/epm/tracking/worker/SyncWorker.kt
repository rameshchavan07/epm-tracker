package com.epm.tracking.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.SessionManager
import com.epm.tracking.data.local.AppDatabase

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val sessionManager = SessionManager(applicationContext)

        // No auth token → user hasn't logged in yet, skip sync
        val token = sessionManager.getAuthToken() ?: return Result.failure()

        // No user ID → can't attribute location to a user
        val userId = sessionManager.getUserId() ?: return Result.failure()

        return try {
            val unsyncedLocations = database.locationDao().getUnsyncedLocations()
            if (unsyncedLocations.isEmpty()) {
                return Result.success()
            }

            val apiService = ApiClient.getService(sessionManager)
            val batchRequest = unsyncedLocations.map { loc ->
                LocationBatchRequest(
                    userId    = userId,
                    latitude  = loc.latitude,
                    longitude = loc.longitude,
                    accuracy  = loc.accuracy,
                    timestamp = loc.timestamp
                )
            }

            val response = apiService.syncLocations(batchRequest)
            if (response.success) {
                // Delete rows that were successfully uploaded
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
