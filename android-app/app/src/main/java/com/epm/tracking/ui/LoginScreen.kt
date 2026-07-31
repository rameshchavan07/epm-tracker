package com.epm.tracking.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.epm.tracking.auth.FaceAuthManager
import com.epm.tracking.data.SessionManager
import com.epm.tracking.ui.components.FaceCaptureCamera
import kotlinx.coroutines.launch
import android.provider.Settings
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.*
import androidx.compose.animation.core.*

@Composable
fun LoginScreen(
    sessionManager: SessionManager,
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    val faceAuthManager = remember { FaceAuthManager(context) }
    val coroutineScope = rememberCoroutineScope()

    var isProcessing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showCamera by remember { mutableStateOf(false) }
    var isVisible by remember { mutableStateOf(false) }
    var verificationConfidence by remember { mutableStateOf<Int?>(null) }
    val isFaceEnrolled = remember { sessionManager.isFaceEnrolled() }

    LaunchedEffect(Unit) {
        isVisible = true
    }

    val infiniteTransition = rememberInfiniteTransition()
    val gradientOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1500f,
        animationSpec = infiniteRepeatable(
            animation = tween(15000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    // Deep space gradient background
    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A), // Deep Slate
            Color(0xFF1E1B4B), // Indigo Dark
            Color(0xFF020617)  // Almost Black
        ),
        startY = gradientOffset,
        endY = gradientOffset + 1500f
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientBackground),
        contentAlignment = Alignment.Center
    ) {
        AnimatedVisibility(
            visible = isVisible,
            enter = fadeIn(animationSpec = tween(800)) + slideInVertically(initialOffsetY = { 60 }, animationSpec = tween(800))
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .padding(16.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1E293B).copy(alpha = 0.85f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Brand Logo Badge
                    Surface(
                        modifier = Modifier
                            .size(72.dp)
                            .padding(bottom = 16.dp),
                        shape = CircleShape,
                        color = Color(0xFF3B82F6).copy(alpha = 0.15f),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.radialGradient(
                                listOf(Color(0xFF60A5FA), Color(0xFF3B82F6))
                            )
                        )
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Logo",
                                tint = Color(0xFF60A5FA),
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }

                    Text(
                        text = "EPM Tracker",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Text(
                        text = if (isFaceEnrolled) "Server-Verified Face ID Authentication" else "First-Time Face Registration",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(bottom = 24.dp)
                    )

                    if (showCamera) {
                        // Camera capture mode
                        FaceCaptureCamera(
                            isCapturing = isProcessing,
                            captureButtonText = if (isFaceEnrolled) "👤 Capture Face to Log In" else "👤 Capture Face to Register",
                            onImageCaptured = { base64Image ->
                                isProcessing = true
                                error = null

                                coroutineScope.launch {
                                    val deviceId = Settings.Secure.getString(
                                        context.contentResolver,
                                        Settings.Secure.ANDROID_ID
                                    ) ?: java.util.UUID.randomUUID().toString()
                                    val userId = sessionManager.getUserId()
                                        ?: "USR-${deviceId.takeLast(6).uppercase()}"

                                    // Check if face is enrolled
                                    if (!sessionManager.isFaceEnrolled()) {
                                        // First-time user: do enrollment instead
                                        android.util.Log.d("EPM_FACE_LOG", "User needs face registration. Starting enrollment on server for User ID: $userId")
                                        val enrolled = faceAuthManager.enrollFaceWithServer(userId, base64Image)
                                        if (enrolled) {
                                            android.util.Log.i("EPM_FACE_LOG", "Face successfully registered/enrolled on server for User ID: $userId")
                                            sessionManager.saveUserId(userId)
                                            sessionManager.saveFaceEnrolled(true)
                                            sessionManager.saveAuthToken("face_auth_token")
                                            sessionManager.recordFaceVerificationSuccess()
                                            isProcessing = false
                                            onLoginSuccess()
                                        } else {
                                            android.util.Log.e("EPM_FACE_LOG", "Face enrollment failed on server for User ID: $userId")
                                            isProcessing = false
                                            error = "Face enrollment failed. Please try again."
                                        }
                                        return@launch
                                    }

                                    android.util.Log.d("EPM_FACE_LOG", "Face is already enrolled. Requesting face verification from server for User ID: $userId")
                                    // Verify face against server-stored profile
                                    val result = faceAuthManager.verifyFaceWithServer(userId, base64Image)

                                    if (result != null && result.match) {
                                        android.util.Log.i("EPM_FACE_LOG", "Face verification succeeded! Match confidence: ${result.confidence}% (distance=${result.distance})")
                                        verificationConfidence = result.confidence
                                        sessionManager.saveUserId(userId)
                                        sessionManager.saveAuthToken("face_auth_token")
                                        sessionManager.recordFaceVerificationSuccess()
                                        isProcessing = false
                                        onLoginSuccess()
                                    } else if (result != null) {
                                        android.util.Log.w("EPM_FACE_LOG", "Face verification failed! Confidence: ${result.confidence}% (distance=${result.distance}) - Server message: ${result.message}")
                                        isProcessing = false
                                        error = "Face does not match. Confidence: ${result.confidence}%. Please try again."
                                    } else {
                                        android.util.Log.e("EPM_FACE_LOG", "Server verification unreachable. Attempting offline local biometric fallback...")
                                        // Network error — fallback to local biometric
                                        isProcessing = false
                                        val activity = context as? androidx.fragment.app.FragmentActivity
                                        if (activity != null) {
                                            faceAuthManager.authenticate(
                                                activity = activity,
                                                title = "Offline Face Login",
                                                subtitle = "Server unreachable. Using local biometric verification.",
                                                onSuccess = {
                                                    android.util.Log.i("EPM_FACE_LOG", "Offline local biometric verification succeeded!")
                                                    sessionManager.saveUserId(userId)
                                                    sessionManager.saveAuthToken("face_auth_token")
                                                    sessionManager.recordFaceVerificationSuccess()
                                                    onLoginSuccess()
                                                },
                                                onError = { err ->
                                                    android.util.Log.e("EPM_FACE_LOG", "Offline local biometric verification failed: $err")
                                                    error = "Offline verification failed: $err"
                                                }
                                            )
                                        } else {
                                            android.util.Log.e("EPM_FACE_LOG", "Offline local biometric fallback unavailable (null Activity)")
                                            error = "Server unreachable and biometric fallback unavailable."
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        // Initial state: show "Open Camera" button
                        Button(
                            onClick = { showCamera = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2563EB)
                            )
                        ) {
                            Text(
                                text = if (isFaceEnrolled) "👤 Open Camera to Log In" else "👤 Open Camera to Register Face",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                    }

                    if (error != null) {
                        Text(
                            text = error!!,
                            color = Color(0xFFF87171),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                    }
                }
            }
        }
    }
}

