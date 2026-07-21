package com.epm.tracking.data.remote

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    // Placeholder URL for now. This will be updated when the backend is built.
    private const val BASE_URL = "https://api.yourdomain.com/"

    val trackingApi: TrackingApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TrackingApi::class.java)
    }
}
