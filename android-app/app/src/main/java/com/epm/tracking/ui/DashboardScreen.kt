package com.epm.tracking.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.scale
import androidx.core.content.ContextCompat
import androidx.compose.animation.core.*
import androidx.compose.animation.*
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import com.epm.tracking.service.TrackingService
import com.epm.tracking.data.local.AppDatabase
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.NetworkType
import androidx.work.Constraints
import com.epm.tracking.worker.SyncWorker

@Composable
fun DashboardScreen(
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var isTracking by remember { mutableStateOf(false) }
    var isConnected by remember { mutableStateOf(false) }
    
    val db = remember { AppDatabase.getDatabase(context) }
    val sessionManager = remember { com.epm.tracking.data.SessionManager(context) }
    val currentUserId = sessionManager.getUserId() ?: "Unknown User"
    val unsyncedCount by db.locationDao().getUnsyncedCount().collectAsState(initial = 0)
    @Suppress("SpellCheckingInspection")
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    var sessionStartTime by remember { mutableStateOf(0L) }
    var sessionDuration by remember { mutableStateOf(0L) }

    LaunchedEffect(isTracking) {
        if (isTracking) {
            sessionStartTime = System.currentTimeMillis()
            while (true) {
                sessionDuration = System.currentTimeMillis() - sessionStartTime
                kotlinx.coroutines.delay(1000)
            }
        } else {
            sessionDuration = 0L
        }
    }

    LaunchedEffect(Unit) {
        val api = com.epm.tracking.data.ApiClient.getService()
        while (true) {
            try {
                val response = api.checkHealth()
                val wasConnected = isConnected
                isConnected = response.isSuccessful
                
                // Force an immediate background sync when network is restored
                if (!wasConnected && isConnected) {
                    val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
                    val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()
                    WorkManager.getInstance(context).enqueue(syncRequest)
                }
            } catch (_: Exception) {
                isConnected = false
            }
            kotlinx.coroutines.delay(5000)
        }
    }

    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A),
            Color(0xFF1E293B),
            Color(0xFF020617)
        )
    )

    val infiniteTransition = rememberInfiniteTransition()
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(gradientBackground)
                .padding(innerPadding)
                .padding(24.dp)
        ) {
            // Top Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Field Agent",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "User: $currentUserId",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF60A5FA),
                        modifier = Modifier.padding(top = 2.dp, bottom = 2.dp)
                    )
                    Text(
                        text = "Live GPS Service Control",
                        fontSize = 13.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                IconButton(
                    onClick = onLogout,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = Color(0xFFEF4444).copy(alpha = 0.15f)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.ExitToApp,
                        contentDescription = "Logout",
                        tint = Color(0xFFF87171)
                    )
                }
            }

            // Live Status Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isTracking) Color(0xFF065F46).copy(alpha = 0.4f) else Color(0xFF334155).copy(alpha = 0.4f)
                ),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(
                        listOf(
                            if (isTracking) Color(0xFF10B981) else Color(0xFF64748B),
                            Color(0xFF3B82F6)
                        )
                    )
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(contentAlignment = Alignment.Center) {
                            if (isTracking) {
                                Surface(
                                    modifier = Modifier.size(24.dp),
                                    shape = CircleShape,
                                    color = Color(0xFF10B981).copy(alpha = pulseAlpha * 0.4f)
                                ) {}
                            }
                            Surface(
                                modifier = Modifier.size(12.dp),
                                shape = CircleShape,
                                color = if (isTracking) Color(0xFF10B981) else Color(0xFF64748B)
                            ) {}
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Column {
                            Text(
                                text = if (isTracking) "TRACKING ACTIVATED" else "TRACKING DEACTIVATED",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (isTracking) Color(0xFF34D399) else Color(0xFF94A3B8),
                                letterSpacing = 0.5.sp
                            )
                            if (isTracking) {
                                val hours = TimeUnit.MILLISECONDS.toHours(sessionDuration)
                                val minutes = TimeUnit.MILLISECONDS.toMinutes(sessionDuration) % 60
                                val seconds = TimeUnit.MILLISECONDS.toSeconds(sessionDuration) % 60
                                val timeString = String.format("%02d:%02d:%02d", hours, minutes, seconds)
                                Text(
                                    text = "Session: $timeString",
                                    fontSize = 13.sp,
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold
                                )
                            } else {
                                Text(
                                    text = "Press Start to begin tracking",
                                    fontSize = 13.sp,
                                    color = Color(0xFFCBD5E1)
                                )
                            }
                        }
                    }

                    Icon(
                        imageVector = if (isTracking) Icons.Default.LocationOn else Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = if (isTracking) Color(0xFF34D399) else Color(0xFF94A3B8),
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            // Cloud Database Connection Indicator
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.5f)),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Color.White.copy(alpha=0.1f), Color.Transparent)))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(12.dp),
                        shape = CircleShape,
                        color = if (isConnected) Color(0xFF10B981) else Color(0xFFEF4444)
                    ) {}
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Cloud Database", fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = if (isConnected) "Connected" else "Disconnected",
                        fontSize = 14.sp,
                        color = if (isConnected) Color(0xFF34D399) else Color(0xFFF87171),
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Local DB Queue Indicator
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.5f)),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(Color.White.copy(alpha=0.1f), Color.Transparent)))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFFA78BFA), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Unsynced Coordinates", fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.weight(1f))
                    
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (unsyncedCount > 0) Color(0xFFF59E0B) else Color(0xFF10B981).copy(alpha = 0.2f),
                        modifier = Modifier.padding(end = 4.dp)
                    ) {
                        Text(
                            text = "$unsyncedCount",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (unsyncedCount > 0) Color.White else Color(0xFF10B981),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            val buttonColor by animateColorAsState(
                targetValue = if (isTracking) Color(0xFFEF4444) else Color(0xFF2563EB),
                animationSpec = tween(500)
            )
            val buttonScale by animateFloatAsState(
                targetValue = if (isTracking) 1f else (1f + pulseAlpha * 0.02f),
                animationSpec = tween(500)
            )

            // Main Tracking Toggle Button
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    if (!isTracking) {
                        // Guard: check location permission before starting the service
                        val hasPermission = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.ACCESS_FINE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED

                        if (!hasPermission) {
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar(
                                    message = "Location permission is required. Please grant it in Settings.",
                                    duration = SnackbarDuration.Long
                                )
                            }
                            return@Button
                        }
                    }

                    val intent = Intent(context, TrackingService::class.java).apply {
                        action = if (isTracking) TrackingService.ACTION_STOP else TrackingService.ACTION_START
                    }
                    if (isTracking) {
                        context.stopService(intent)
                    } else {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            context.startForegroundService(intent)
                        } else {
                            context.startService(intent)
                        }
                    }
                    isTracking = !isTracking
                    
                    // Trigger an immediate sync when toggling tracking state
                    val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
                    val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()
                    WorkManager.getInstance(context).enqueue(syncRequest)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .scale(buttonScale),
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = buttonColor
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp, pressedElevation = 2.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (isTracking) Icons.Default.Close else Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isTracking) "Stop Location Sharing" else "Start Location Sharing",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

