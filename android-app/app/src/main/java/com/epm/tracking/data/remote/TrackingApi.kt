package com.epm.tracking.data.remote

import com.epm.tracking.data.local.entity.LocationEntity
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface TrackingApi {

    @POST("/api/v1/tracking/location/batch")
    suspend fun syncLocations(@Body locations: List<LocationEntity>): Response<Unit>
}
