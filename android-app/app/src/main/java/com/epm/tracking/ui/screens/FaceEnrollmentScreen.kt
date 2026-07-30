package com.epm.tracking.ui.screens

import android.provider.Settings
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.epm.tracking.auth.FaceAuthManager
import com.epm.tracking.data.SessionManager
import com.epm.tracking.ui.components.FaceCaptureCamera
import kotlinx.coroutines.launch

@Composable
fun FaceEnrollmentScreen(
    sessionManager: SessionManager,
    onEnrollmentComplete: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val faceAuthManager = remember { FaceAuthManager(context) }

    var isProcessing by remember { mutableStateOf(false) }
    var isSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF020617)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "First-Time Face Setup",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Text(
                text = "Position your face inside the frame and capture to register your profile",
                fontSize = 13.sp,
                color = Color(0xFF94A3B8),
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
            )

            if (isSuccess) {
                // Success state
                Box(
                    modifier = Modifier
                        .size(240.dp, 300.dp)
                        .background(Color(0xFF065F46).copy(alpha = 0.3f), shape = RoundedCornerShape(120.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Success",
                        tint = Color(0xFF22C55E),
                        modifier = Modifier.size(80.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "✓ Face Enrolled Successfully!",
                    color = Color(0xFF22C55E),
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            } else {
                // Camera capture state
                FaceCaptureCamera(
                    isCapturing = isProcessing,
                    captureButtonText = "📷 Enroll & Register Face Profile",
                    onImageCaptured = { base64Image ->
                        isProcessing = true
                        errorMessage = null

                        coroutineScope.launch {
                            val deviceId = Settings.Secure.getString(
                                context.contentResolver,
                                Settings.Secure.ANDROID_ID
                            ) ?: "unknown"
                            val userId = sessionManager.getUserId()
                                ?: "USR-${deviceId.takeLast(6).uppercase()}"

                            // Send face image to server for enrollment
                            val success = faceAuthManager.enrollFaceWithServer(userId, base64Image)

                            if (success) {
                                sessionManager.saveUserId(userId)
                                sessionManager.saveFaceEnrolled(true)
                                sessionManager.recordFaceVerificationSuccess()
                                isProcessing = false
                                isSuccess = true

                                kotlinx.coroutines.delay(1200L)
                                onEnrollmentComplete()
                            } else {
                                isProcessing = false
                                errorMessage = "Face enrollment failed. Please ensure your face is clearly visible and try again."
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = errorMessage!!, color = Color(0xFFEF4444), fontSize = 13.sp)
            }
        }
    }
}

