package com.epm.tracking.auth

import android.content.Context
import android.provider.Settings
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.FaceEnrollRequest
import com.epm.tracking.data.FaceVerifyRequest
import com.epm.tracking.data.FaceVerifyResponse
import java.util.concurrent.Executor

class FaceAuthManager(private val context: Context) {

    private val executor: Executor = ContextCompat.getMainExecutor(context)

    fun canAuthenticateBiometrics(): Boolean {
        val biometricManager = BiometricManager.from(context)
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
                             BiometricManager.Authenticators.BIOMETRIC_WEAK
        return biometricManager.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        activity: FragmentActivity,
        title: String = "Face Identity Verification",
        subtitle: String = "Scan face to verify identity and maintain tracking session",
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (!canAuthenticateBiometrics()) {
            onSuccess()
            return
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            )
            .build()

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onError(errString.toString())
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onError("Face recognition failed. Please try again.")
                }
            }
        )

        biometricPrompt.authenticate(promptInfo)
    }

    /**
     * Enroll face on the server using employeeCode.
     * Returns Pair(success, message).
     */
    suspend fun enrollFaceWithServer(
        employeeCode: String,
        base64Image: String,
        registeredBy: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ): Pair<Boolean, String?> {
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"

        return try {
            android.util.Log.d("EPM_FACE_LOG", "Sending enroll-face request to server for employeeCode=$employeeCode, deviceId=$deviceId")
            val response = ApiClient.getService().enrollFace(
                FaceEnrollRequest(
                    employeeCode = employeeCode,
                    deviceId = deviceId,
                    faceImage = base64Image,
                    registeredBy = registeredBy ?: employeeCode,
                    latitude = latitude,
                    longitude = longitude
                )
            )
            android.util.Log.i("EPM_FACE_LOG", "Enroll-face server response: success=${response.success}, message=${response.message}")
            Pair(response.success, response.message)
        } catch (e: Exception) {
            android.util.Log.e("EPM_FACE_LOG", "Enroll-face FAILED with exception: ${e.javaClass.simpleName}: ${e.message}")
            Pair(false, e.message)
        }
    }

    /**
     * Verify face against server-stored profile using employeeCode.
     */
    suspend fun verifyFaceWithServer(
        employeeCode: String,
        base64Image: String,
        isLogout: Boolean = false,
        latitude: Double? = null,
        longitude: Double? = null
    ): FaceVerifyResponse? {
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"

        return try {
            android.util.Log.d("EPM_FACE_LOG", "Sending verify-face request to server for employeeCode=$employeeCode, deviceId=$deviceId, isLogout=$isLogout")
            val response = ApiClient.getService().verifyFace(
                FaceVerifyRequest(
                    employeeCode = employeeCode,
                    deviceId = deviceId,
                    faceImage = base64Image,
                    isLogout = isLogout,
                    event = if (isLogout) "LOGOUT" else "LOGIN",
                    latitude = latitude,
                    longitude = longitude
                )
            )
            Log.e("FaceAuthManager", "Verify-face server response: ${response}")
            android.util.Log.i("EPM_FACE_LOG", "Verify-face server response: match=${response.match}, confidence=${response.confidence}%, distance=${response.distance}")
            response
        } catch (e: Exception) {
            Log.e("FaceAuthManager", "Verify-face exception: ${e.message}")
            android.util.Log.e("EPM_FACE_LOG", "Verify-face FAILED with exception: ${e.javaClass.simpleName}: ${e.message}")
            null
        }
    }
}
