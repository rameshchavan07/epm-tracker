package com.epm.tracking.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
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
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.LoginRequest
import com.epm.tracking.data.SessionManager
import kotlinx.coroutines.launch
import android.provider.Settings
import androidx.compose.ui.platform.LocalContext
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.Manifest
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import kotlinx.coroutines.tasks.await
import com.google.android.gms.location.LocationServices

@Composable
fun LoginScreen(
    sessionManager: SessionManager,
    onLoginSuccess: () -> Unit
) {
    var userId by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var isVisible by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val faceAuthManager = remember { com.epm.tracking.auth.FaceAuthManager(context) }
    val activity = context as? androidx.fragment.app.FragmentActivity

    fun triggerFaceLogin() {
        if (activity == null) {
            sessionManager.recordFaceVerificationSuccess()
            onLoginSuccess()
            return
        }

        isLoading = true
        error = null

        faceAuthManager.authenticate(
            activity = activity,
            title = "Face ID Login",
            subtitle = "Scan your face to authenticate and start location tracking session",
            onSuccess = {
                isLoading = false
                val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: java.util.UUID.randomUUID().toString()
                val existingUserId = sessionManager.getUserId() ?: "USR-${deviceId.takeLast(6).uppercase()}"
                sessionManager.saveUserId(existingUserId)
                sessionManager.saveAuthToken("face_auth_token")
                sessionManager.recordFaceVerificationSuccess()
                onLoginSuccess()
            },
            onError = { err ->
                isLoading = false
                error = err
            }
        )
    }

    LaunchedEffect(Unit) {
        isVisible = true
        val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: java.util.UUID.randomUUID().toString()
        userId = sessionManager.getUserId() ?: "USR-${deviceId.takeLast(6).uppercase()}"
        
        // Auto trigger face prompt on initial launch
        kotlinx.coroutines.delay(400)
        triggerFaceLogin()
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
                        text = "Field Operations & Face ID Authentication",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(bottom = 24.dp)
                    )

                    if (isLoading) {
                        CircularProgressIndicator(
                            color = Color(0xFF3B82F6),
                            modifier = Modifier
                                .padding(vertical = 16.dp)
                                .size(36.dp),
                            strokeWidth = 3.dp
                        )
                        Text(
                            text = "Scanning Face Identity...",
                            color = Color(0xFF94A3B8),
                            fontSize = 14.sp,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )
                    } else {
                        Button(
                            onClick = { triggerFaceLogin() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2563EB)
                            )
                        ) {
                            Text("👤 Scan Face to Log In", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
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
