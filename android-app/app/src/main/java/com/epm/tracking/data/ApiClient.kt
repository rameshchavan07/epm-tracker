package com.epm.tracking.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.epm.tracking.BuildConfig

object ApiClient {
    private var retrofit: Retrofit? = null

    fun getService(): ApiService {
        if (retrofit == null) {
            val clientBuilder = OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)

            // Debug-only logging
            if (BuildConfig.DEBUG) {
                val loggingInterceptor = HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
                clientBuilder.addInterceptor(loggingInterceptor)
            }

            retrofit = Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(clientBuilder.build())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }

    /**
     * Reset the retrofit instance (e.g. if server URL changes at runtime).
     */
    fun reset() {
        retrofit = null
    }
}
