package com.epm.tracking.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class TrackingConfigResponse(
    val trackingIntervalMinutes: Long,
    val trackingIntervalMs: Long
)

data class LoginRequest(
    val userId: String,
    val deviceId: String,
    val latitude: Double,
    val longitude: Double
)

data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String? = null,
    val companyId: String? = null,
    val shortId: String? = null
)

data class LoginResponse(
    val access_token: String,
    val user: UserDto? = null
)

data class LocationBatchRequest(
    val deviceId: String,
    val mobileUserId: String? = null,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val batteryLevel: Int? = null,
    val timestamp: Long
)

data class SyncResponse(val success: Boolean, val count: Int)

interface ApiService {
    @GET("api/v1/tracking/config")
    suspend fun getTrackingConfig(): TrackingConfigResponse

    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/v1/auth/device-register")
    suspend fun registerDevice(): UserDto

    @POST("api/v1/tracking/location/batch")
    suspend fun syncLocations(@Body locations: List<LocationBatchRequest>): SyncResponse
}
