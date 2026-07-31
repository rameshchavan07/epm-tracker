package com.epm.tracking.auth

import android.content.Context
import android.provider.Settings
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
        // Removed DEVICE_CREDENTIAL — no PIN/pattern fallback allowed
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
                             BiometricManager.Authenticators.BIOMETRIC_WEAK
        return biometricManager.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS
    }

    /**
     * Local biometric authentication (fallback only).
     * Used when server is unreachable or models aren't loaded.
     */
    fun authenticate(
        activity: FragmentActivity,
        title: String = "Face Identity Verification",
        subtitle: String = "Scan face to verify identity and maintain tracking session",
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (!canAuthenticateBiometrics()) {
            // Fallback for emulator or devices without active biometrics configured
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
     * Enroll face on the server with a real face image.
     * Sends Base64-encoded JPEG to POST /api/v1/auth/enroll-face
     * where face-api.js extracts and stores the 128-dim descriptor.
     */
    suspend fun enrollFaceWithServer(
        userId: String,
        base64Image: String
    ): Boolean {
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"

        return try {
            android.util.Log.d("EPM_FACE_LOG", "Sending enroll-face request to server for userId=$userId, deviceId=$deviceId")
            val response = ApiClient.getService().enrollFace(
                FaceEnrollRequest(
                    userId = userId,
                    deviceId = deviceId,
                    faceImage = base64Image
                )
            )
            android.util.Log.i("EPM_FACE_LOG", "Enroll-face server response: success=${response.success}")
            response.success
        } catch (e: Exception) {
            android.util.Log.e("EPM_FACE_LOG", "Enroll-face FAILED with exception: ${e.javaClass.simpleName}: ${e.message}")
            false
        }
    }

    /**
     * Verify face against server-stored profile.
     * Sends Base64-encoded JPEG to POST /api/v1/auth/verify-face
     * where face-api.js compares the face descriptor against the stored one.
     *
     * @return FaceVerifyResponse with match result and confidence, or null on network error.
     */
    suspend fun verifyFaceWithServer(
        userId: String,
        base64Image: String
    ): FaceVerifyResponse? {
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"

        return try {
            android.util.Log.d("EPM_FACE_LOG", "Sending verify-face request to server for userId=$userId, deviceId=$deviceId")
            val response = ApiClient.getService().verifyFace(
                FaceVerifyRequest(
                    userId = userId,
                    deviceId = deviceId,
                    faceImage = base64Image
                )
            )
            android.util.Log.i("EPM_FACE_LOG", "Verify-face server response: match=${response.match}, confidence=${response.confidence}%, distance=${response.distance}")
            response
        } catch (e: Exception) {
            android.util.Log.e("EPM_FACE_LOG", "Verify-face FAILED with exception: ${e.javaClass.simpleName}: ${e.message}")
            null
        }
    }
}

