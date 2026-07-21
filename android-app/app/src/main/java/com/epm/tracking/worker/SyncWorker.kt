package com.epm.tracking.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.AppDatabase
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.SessionManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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

            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            
            // To get actual userId from token, we'd ideally decode the JWT. 
            // For this scaffold, we'll hardcode the seeded employee ID that we created in backend.
            val employeeId = "03478d59-b1d5-47eb-ba68-d069baf46da2" // Need to fetch dynamically in real app
            
            val batchRequest = unsyncedLocations.map { loc ->
                LocationBatchRequest(
                    userId = employeeId,
                    latitude = loc.latitude,
                    longitude = loc.longitude,
                    accuracy = loc.accuracy,
                    timestamp = dateFormat.format(Date(loc.timestamp))
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
