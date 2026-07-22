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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.epm.tracking.service.LocationService
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var isTracking by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A),
            Color(0xFF1E293B),
            Color(0xFF0F172A)
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
                        text = "EPM Field Agent",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
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
                        Surface(
                            modifier = Modifier.size(14.dp),
                            shape = CircleShape,
                            color = if (isTracking) Color(0xFF10B981) else Color(0xFF94A3B8)
                        ) {}

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = if (isTracking) "ACTIVE TRACKING" else "OFFLINE SERVICE",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isTracking) Color(0xFF34D399) else Color(0xFF94A3B8)
                            )
                            Text(
                                text = if (isTracking) "GPS telemetry sending..." else "Press Start to begin tracking",
                                fontSize = 12.sp,
                                color = Color(0xFFCBD5E1)
                            )
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

            // Telemetry Metrics Grid (2x2)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Card 1: GPS Signal
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.7f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF60A5FA), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("GPS Accuracy", fontSize = 12.sp, color = Color(0xFF94A3B8))
                        Text("± 8.5 m", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                // Card 2: Battery Status
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.7f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Power Profile", fontSize = 12.sp, color = Color(0xFF94A3B8))
                        Text("Optimized", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 32.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Card 3: Cache Queue
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.7f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFFA78BFA), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Sync Queue", fontSize = 12.sp, color = Color(0xFF94A3B8))
                        Text("Auto-Sync", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                // Card 4: Network Mode
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.7f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Cloud Link", fontSize = 12.sp, color = Color(0xFF94A3B8))
                        Text("Connected", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Main Tracking Toggle Button
            Button(
                onClick = {
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

                    val intent = Intent(context, LocationService::class.java).apply {
                        action = if (isTracking) LocationService.ACTION_STOP else LocationService.ACTION_START
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
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isTracking) Color(0xFFDC2626) else Color(0xFF059669)
                )
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
                        text = if (isTracking) "Stop Location Service" else "Start Location Service",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

