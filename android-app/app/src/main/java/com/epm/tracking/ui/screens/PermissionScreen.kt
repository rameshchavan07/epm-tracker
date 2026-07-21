package com.epm.tracking.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun PermissionScreen(onPermissionsGranted: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Location Permission Required",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "EPM Tracking requires background location access to track your shift routes.",
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = { onPermissionsGranted() },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Grant Permissions")
        }
    }
}
