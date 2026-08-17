package com.epm.tracking.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class TrackingConfigResponse(
    val trackingIntervalMinutes: Long,
    val trackingIntervalMs: Long,
    val faceVerificationIntervalMinutes: Long? = 120L,
    val faceVerificationIntervalMs: Long? = 7200000L,
    val faceVerificationGracePeriodMinutes: Long? = 5L,
    val faceVerificationGracePeriodMs: Long? = 300000L
)

data class LoginRequest(
    val employeeCode: String? = null,
    val userId: String? = null,
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
    val employeeCode: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val batteryLevel: Int? = null,
    val address: String? = null,
    val timestamp: Long
)

data class SyncResponse(val success: Boolean, val count: Int)

data class OfflineRequest(
    val employeeCode: String? = null,
    val deviceId: String? = null
)

data class ValidateEmployeeRequest(
    val employeeCode: String
)

data class ValidateEmployeeResponse(
    val valid: Boolean,
    val employeeCode: String? = null,
    val name: String? = null,
    val message: String? = null
)

data class FaceEnrollRequest(
    val employeeCode: String,
    val deviceId: String,
    val faceImage: String? = null,
    val registeredBy: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class FaceEnrollResponse(val success: Boolean, val message: String)

data class FaceVerifyRequest(
    val employeeCode: String,
    val deviceId: String,
    val faceImage: String,
    val isLogout: Boolean? = null,
    val event: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class FaceVerifyResponse(
    val match: Boolean,
    val confidence: Int,
    val distance: Double,
    val threshold: Double,
    val message: String,
    val employeeCode: String? = null
)

interface ApiService {
    @GET("api/v1")
    suspend fun checkHealth(): retrofit2.Response<okhttp3.ResponseBody>

    @GET("api/v1/tracking/config")
    suspend fun getTrackingConfig(): TrackingConfigResponse

    @POST("api/v1/auth/validate-employee")
    suspend fun validateEmployee(@Body request: ValidateEmployeeRequest): ValidateEmployeeResponse

    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/v1/auth/enroll-face")
    suspend fun enrollFace(@Body request: FaceEnrollRequest): FaceEnrollResponse

    @POST("api/v1/auth/verify-face")
    suspend fun verifyFace(@Body request: FaceVerifyRequest): FaceVerifyResponse

    @POST("api/v1/tracking/location/batch")
    suspend fun syncLocations(@Body locations: List<LocationBatchRequest>): SyncResponse

    @POST("api/v1/tracking/offline")
    suspend fun markOffline(@Body request: OfflineRequest): retrofit2.Response<okhttp3.ResponseBody>
}
