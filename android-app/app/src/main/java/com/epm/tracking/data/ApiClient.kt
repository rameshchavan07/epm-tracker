package com.epm.tracking.data

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    // 10.0.2.2 is the default alias to your host loopback interface in Android Emulator.
    // Replace with your local machine's IP address (e.g. "http://192.168.1.100:3000/") when testing on a physical device.
    private const val BASE_URL = "http://10.0.2.2:3000/"

    private var retrofit: Retrofit? = null

    fun getService(sessionManager: SessionManager): ApiService {
        if (retrofit == null) {
            val authInterceptor = Interceptor { chain ->
                val requestBuilder = chain.request().newBuilder()
                sessionManager.getAuthToken()?.let { token ->
                    requestBuilder.addHeader("Authorization", "Bearer $token")
                }
                chain.proceed(requestBuilder.build())
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }
}
