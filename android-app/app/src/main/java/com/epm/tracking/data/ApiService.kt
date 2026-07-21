package com.epm.tracking.data

import retrofit2.http.Body
import retrofit2.http.POST

data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val access_token: String)

data class LocationBatchRequest(
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: String
)

data class SyncResponse(val success: Boolean, val count: Int)

interface ApiService {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/v1/tracking/location/batch")
    suspend fun syncLocations(@Body locations: List<LocationBatchRequest>): SyncResponse
}
