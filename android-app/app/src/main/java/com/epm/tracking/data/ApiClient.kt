package com.epm.tracking.data

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    // 10.0.2.2 is the special alias to your host loopback interface in Android Emulator
    // But since you want to test on a physical phone, you MUST replace this with your computer's local IP address
    // e.g. "http://172.17.47.133:3000/"
    private const val BASE_URL = "http://172.17.47.133:3000/" 

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
