package com.epm.tracking.ui.screens

import android.provider.Settings
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Face
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.FaceEnrollRequest
import com.epm.tracking.data.SessionManager
import kotlinx.coroutines.launch

@Composable
fun FaceEnrollmentScreen(
    sessionManager: SessionManager,
    onEnrollmentComplete: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isScanning by remember { mutableStateOf(false) }
    var isSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val infiniteTransition = rememberInfiniteTransition()
    val scanLineY by infiniteTransition.animateFloat(
        initialValue = 0.1f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    fun startEnrollment() {
        isScanning = true
        errorMessage = null

        coroutineScope.launch {
            kotlinx.coroutines.delay(1800L) // Simulate biometric facial extraction

            val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
            val userId = sessionManager.getUserId() ?: "USR-${deviceId.takeLast(6).uppercase()}"

            try {
                ApiClient.getService().enrollFace(
                    FaceEnrollRequest(userId = userId, deviceId = deviceId)
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }

            sessionManager.saveUserId(userId)
            sessionManager.saveFaceEnrolled(true)
            sessionManager.recordFaceVerificationSuccess()
            isScanning = false
            isSuccess = true

            kotlinx.coroutines.delay(1000L)
            onEnrollmentComplete()
        }
    }

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
                text = "Position your face inside the frame to register your profile",
                fontSize = 13.sp,
                color = Color(0xFF94A3B8),
                modifier = Modifier.padding(top = 8.dp, bottom = 32.dp)
            )

            // Oval Camera / Face Oval Frame Guide
            Box(
                modifier = Modifier
                    .size(240.dp, 300.dp)
                    .background(Color(0xFF1E293B).copy(alpha = 0.7f), shape = RoundedCornerShape(120.dp))
                    .border(
                        width = 3.dp,
                        brush = Brush.verticalGradient(
                            listOf(
                                if (isSuccess) Color(0xFF22C55E) else Color(0xFF60A5FA),
                                if (isSuccess) Color(0xFF16A34A) else Color(0xFF3B82F6)
                            )
                        ),
                        shape = RoundedCornerShape(120.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isSuccess) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Success",
                        tint = Color(0xFF22C55E),
                        modifier = Modifier.size(80.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Face,
                        contentDescription = "Face Guide",
                        tint = Color(0xFF94A3B8).copy(alpha = 0.6f),
                        modifier = Modifier.size(110.dp)
                    )

                    // Scanning bar line animation
                    if (isScanning) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val lineY = size.height * scanLineY
                            drawLine(
                                color = Color(0xFF60A5FA),
                                start = Offset(20f, lineY),
                                end = Offset(size.width - 20f, lineY),
                                strokeWidth = 6f
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            if (isScanning) {
                CircularProgressIndicator(color = Color(0xFF3B82F6), modifier = Modifier.size(32.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Extracting facial features...", color = Color(0xFF60A5FA), fontSize = 14.sp)
            } else if (isSuccess) {
                Text(text = "✓ Face Enrolled Successfully!", color = Color(0xFF22C55E), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            } else {
                Button(
                    onClick = { startEnrollment() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text("📷 Enroll & Register Face Profile", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = errorMessage!!, color = Color(0xFFEF4444), fontSize = 13.sp)
            }
        }
    }
}
