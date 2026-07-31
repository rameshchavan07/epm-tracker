package com.epm.tracking.data

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    // Your local machine's IP on the network. Run `ipconfig` on Windows to find it.
    // Update this whenever your IP changes (e.g. after reconnecting to WiFi).
    // For Android Emulator only, use: "http://10.0.2.2:3000/"
    private const val BASE_URL = "http://172.17.47.133:3000/"

    private var retrofit: Retrofit? = null

    fun getService(): ApiService {
        if (retrofit == null) {
            val client = OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
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
