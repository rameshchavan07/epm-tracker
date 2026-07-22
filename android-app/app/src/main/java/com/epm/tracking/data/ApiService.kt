package com.epm.tracking.data

import retrofit2.http.Body
import retrofit2.http.POST

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
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: Long
)

data class SyncResponse(val success: Boolean, val count: Int)

interface ApiService {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/v1/auth/device-register")
    suspend fun registerDevice(): UserDto

    @POST("api/v1/tracking/location/batch")
    suspend fun syncLocations(@Body locations: List<LocationBatchRequest>): SyncResponse
}
