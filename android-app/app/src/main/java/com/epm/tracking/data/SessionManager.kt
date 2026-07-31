package com.epm.tracking.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SessionManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "epm_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun saveUserId(userId: String) {
        sharedPreferences.edit().putString(KEY_USER_ID, userId).apply()
    }

    fun getUserId(): String? {
        return sharedPreferences.getString(KEY_USER_ID, null)
    }

    fun saveShortId(shortId: String) {
        sharedPreferences.edit().putString(KEY_SHORT_ID, shortId).apply()
    }

    fun getShortId(): String? {
        return sharedPreferences.getString(KEY_SHORT_ID, null)
    }

    fun saveTrackingInterval(intervalMs: Long) {
        sharedPreferences.edit().putLong(KEY_TRACKING_INTERVAL, intervalMs).apply()
    }

    fun getTrackingInterval(): Long {
        return sharedPreferences.getLong(KEY_TRACKING_INTERVAL, 120000L)
    }

    fun saveFaceVerificationInterval(intervalMs: Long) {
        sharedPreferences.edit().putLong(KEY_FACE_VERIFICATION_INTERVAL, intervalMs).apply()
    }

    fun getFaceVerificationInterval(): Long {
        return sharedPreferences.getLong(KEY_FACE_VERIFICATION_INTERVAL, 7200000L) // Default 2 hours
    }

    fun saveFaceVerificationGracePeriod(gracePeriodMs: Long) {
        sharedPreferences.edit().putLong(KEY_FACE_VERIFICATION_GRACE_PERIOD, gracePeriodMs).apply()
    }

    fun getFaceVerificationGracePeriod(): Long {
        return sharedPreferences.getLong(KEY_FACE_VERIFICATION_GRACE_PERIOD, 300000L) // Default 5 minutes
    }

    fun recordFaceVerificationSuccess() {
        val now = System.currentTimeMillis()
        sharedPreferences.edit()
            .putLong(KEY_LAST_FACE_VERIFICATION_TIME, now)
            .remove(KEY_PENDING_VERIFICATION_START_TIME)
            .apply()
    }

    fun getLastFaceVerificationTime(): Long {
        return sharedPreferences.getLong(KEY_LAST_FACE_VERIFICATION_TIME, 0L)
    }

    fun isFaceVerificationDue(): Boolean {
        val lastVerified = getLastFaceVerificationTime()
        if (lastVerified == 0L) return true
        val interval = getFaceVerificationInterval()
        return (System.currentTimeMillis() - lastVerified) >= interval
    }

    fun startPendingVerificationGracePeriod(): Long {
        var startTime = sharedPreferences.getLong(KEY_PENDING_VERIFICATION_START_TIME, 0L)
        if (startTime == 0L) {
            startTime = System.currentTimeMillis()
            sharedPreferences.edit().putLong(KEY_PENDING_VERIFICATION_START_TIME, startTime).apply()
        }
        return startTime
    }

    fun getPendingVerificationStartTime(): Long {
        return sharedPreferences.getLong(KEY_PENDING_VERIFICATION_START_TIME, 0L)
    }

    fun isGracePeriodExpired(): Boolean {
        val startTime = getPendingVerificationStartTime()
        if (startTime == 0L) return false
        val gracePeriodMs = getFaceVerificationGracePeriod()
        return (System.currentTimeMillis() - startTime) >= gracePeriodMs
    }

    fun saveFaceEnrolled(enrolled: Boolean) {
        sharedPreferences.edit().putBoolean(KEY_FACE_ENROLLED, enrolled).apply()
    }

    fun isFaceEnrolled(): Boolean {
        return sharedPreferences.getBoolean(KEY_FACE_ENROLLED, false)
    }

    fun clearSession() {
        sharedPreferences.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_SHORT_ID)
            .remove(KEY_LAST_FACE_VERIFICATION_TIME)
            .remove(KEY_PENDING_VERIFICATION_START_TIME)
            .apply()
    }

    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_SHORT_ID = "short_id"
        private const val KEY_TRACKING_INTERVAL = "tracking_interval_ms"
        private const val KEY_FACE_VERIFICATION_INTERVAL = "face_verification_interval_ms"
        private const val KEY_FACE_VERIFICATION_GRACE_PERIOD = "face_verification_grace_period_ms"
        private const val KEY_LAST_FACE_VERIFICATION_TIME = "last_face_verification_time"
        private const val KEY_PENDING_VERIFICATION_START_TIME = "pending_verification_start_time"
        private const val KEY_FACE_ENROLLED = "is_face_enrolled"
    }
}
