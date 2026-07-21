package com.epm.tracking.ui

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.epm.tracking.service.LocationService

@Composable
fun DashboardScreen(
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var isTracking by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "EPM Dashboard",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Text(
            text = if (isTracking) "Status: Tracking Active" else "Status: Offline",
            style = MaterialTheme.typography.titleMedium,
            color = if (isTracking) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Button(
            onClick = {
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
            modifier = Modifier.fillMaxWidth().height(60.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isTracking) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
            )
        ) {
            Text(if (isTracking) "Stop Tracking" else "Start Tracking")
        }

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedButton(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Logout")
        }
    }
}
