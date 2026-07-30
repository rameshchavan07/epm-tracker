package com.epm.tracking.ui.components

import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.epm.tracking.auth.FaceAuthManager
import com.epm.tracking.data.SessionManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun VerificationDialog(
    sessionManager: SessionManager,
    onVerificationSuccess: () -> Unit,
    onExpired: () -> Unit
) {
    val context = LocalContext.current
    val faceAuthManager = remember { FaceAuthManager(context) }
    val coroutineScope = rememberCoroutineScope()

    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isProcessing by remember { mutableStateOf(false) }

    val gracePeriodMs = remember { sessionManager.getFaceVerificationGracePeriod() }
    val pendingStartTime = remember { sessionManager.startPendingVerificationGracePeriod() }

    var remainingTimeMs by remember {
        mutableLongStateOf(
            (gracePeriodMs - (System.currentTimeMillis() - pendingStartTime)).coerceAtLeast(0L)
        )
    }

    // Countdown timer ticker
    LaunchedEffect(pendingStartTime) {
        while (remainingTimeMs > 0L) {
            delay(1000L)
            val updatedRemaining = (gracePeriodMs - (System.currentTimeMillis() - pendingStartTime)).coerceAtLeast(0L)
            remainingTimeMs = updatedRemaining
            if (updatedRemaining <= 0L) {
                onExpired()
                break
            }
        }
    }

    val minutes = (remainingTimeMs / 1000) / 60
    val seconds = (remainingTimeMs / 1000) % 60
    val formattedTime = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)

    val activity = context as? androidx.fragment.app.FragmentActivity

    Dialog(
        onDismissRequest = { /* Prevent dismissing without verifying */ },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f)
                .padding(8.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "🔒 Identity Verification Required",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Your 2-hour session check is due. Capture your face to keep tracking active.",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Countdown Timer Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), shape = RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Time Remaining (Grace Period)",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = formattedTime,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (remainingTimeMs < 60000L) Color(0xFFEF4444) else Color(0xFF3B82F6)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Embedded camera for face capture
                FaceCaptureCamera(
                    isCapturing = isProcessing,
                    captureButtonText = "Verify Face Now",
                    onImageCaptured = { base64Image ->
                        isProcessing = true
                        errorMessage = null

                        coroutineScope.launch {
                            val userId = sessionManager.getUserId() ?: "unknown"

                            // Try server-side verification first
                            val result = faceAuthManager.verifyFaceWithServer(userId, base64Image)

                            if (result != null && result.match) {
                                sessionManager.recordFaceVerificationSuccess()
                                isProcessing = false
                                onVerificationSuccess()
                            } else if (result != null) {
                                isProcessing = false
                                errorMessage = "Face does not match (${result.confidence}% confidence). Try again."
                            } else {
                                // Network error — fallback to local biometric
                                isProcessing = false
                                if (activity != null) {
                                    faceAuthManager.authenticate(
                                        activity = activity,
                                        title = "Re-verify Face Identity",
                                        subtitle = "Server unreachable. Using local biometric verification.",
                                        onSuccess = {
                                            sessionManager.recordFaceVerificationSuccess()
                                            onVerificationSuccess()
                                        },
                                        onError = { err ->
                                            errorMessage = "Offline verification failed: $err"
                                        }
                                    )
                                } else {
                                    errorMessage = "Server unreachable. Please check your connection."
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = errorMessage!!,
                        color = Color(0xFFF87171),
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

