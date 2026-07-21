package com.epm.tracking.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.AppDatabase
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.SessionManager

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val sessionManager = SessionManager(applicationContext)
        val apiService = ApiClient.getService(sessionManager)
        
        val token = sessionManager.getAuthToken()
        if (token == null) {
            return Result.failure()
        }

        try {
            val unsyncedLocations = database.locationDao().getUnsyncedLocations()
            if (unsyncedLocations.isEmpty()) {
                return Result.success()
            }

            // Retrieve cached user ID or fallback to default seeded employee ID
            val userId = sessionManager.getUserId() ?: "03478d59-b1d5-47eb-ba68-d069baf46da2"
            
            val batchRequest = unsyncedLocations.map { loc ->
                LocationBatchRequest(
                    userId = userId,
                    latitude = loc.latitude,
                    longitude = loc.longitude,
                    accuracy = loc.accuracy,
                    timestamp = loc.timestamp
                )
            }

            val response = apiService.syncLocations(batchRequest)
            if (response.success) {
                database.locationDao().deleteLocations(unsyncedLocations.map { it.id })
                return Result.success()
            }
            return Result.retry()
        } catch (e: Exception) {
            e.printStackTrace()
            return Result.retry()
        }
    }
}
