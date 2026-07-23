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
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        val existingUserId = sessionManager.getUserId()
        
        if (existingUserId == null) {
            isLoading = true
            // Generate a local user ID using Android device ID or a random UUID
            val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: java.util.UUID.randomUUID().toString()
            val newUserId = "USR-${deviceId.takeLast(6).uppercase()}"
            
            sessionManager.saveUserId(newUserId)
            sessionManager.saveAuthToken("dummy_token") // Satisfy AppNavigation
            userId = newUserId
        } else {
            userId = existingUserId
        }

        // Delay slightly for smooth transition, then navigate to dashboard
        kotlinx.coroutines.delay(500)
        onLoginSuccess()
    }

    // Deep space gradient background
    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A), // Deep Slate
            Color(0xFF1E1B4B), // Indigo Dark
            Color(0xFF020617)  // Almost Black
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientBackground),
        contentAlignment = Alignment.Center
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
                    text = "Field Operations & Location Portal",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(bottom = 32.dp)
                )

                // Just show loading spinner while automatically logging in
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color(0xFF3B82F6),
                        modifier = Modifier
                            .padding(top = 16.dp)
                            .size(32.dp),
                        strokeWidth = 3.dp
                    )
                    Text(
                        text = "Authenticating device...",
                        color = Color(0xFF94A3B8),
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                } else if (error != null) {
                    Button(
                        onClick = {
                            // Retry logic could be added here, or just force a restart of LaunchedEffect
                            error = "Please restart the app to try again."
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF2563EB)
                        )
                    ) {
                        Text("Retry", color = Color.White)
                    }
                }
            }
        }
    }
}
