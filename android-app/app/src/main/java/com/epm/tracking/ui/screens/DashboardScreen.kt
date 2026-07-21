package com.epm.tracking.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.content.Intent
import com.epm.tracking.service.TrackingService

@Composable
fun DashboardScreen() {
    val context = LocalContext.current
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "Dashboard", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(text = "You are currently online and tracking.")
        
        Button(
            onClick = {
                Intent(context, TrackingService::class.java).apply {
                    action = TrackingService.ACTION_START
                    context.startForegroundService(this)
                }
            }
        ) {
            Text("Start Shift")
        }
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = {
                Intent(context, TrackingService::class.java).apply {
                    action = TrackingService.ACTION_STOP
                    context.startService(this)
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
        ) {
            Text("End Shift")
        }
    }
}
