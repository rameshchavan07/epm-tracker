package com.epm.tracking.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.fragment.app.FragmentActivity
import com.epm.tracking.auth.FaceAuthManager
import com.epm.tracking.data.SessionManager
import kotlinx.coroutines.delay
import java.util.Locale

@Composable
fun VerificationDialog(
    sessionManager: SessionManager,
    onVerificationSuccess: () -> Unit,
    onExpired: () -> Unit
) {
    val context = LocalContext.current
    val faceAuthManager = remember { FaceAuthManager(context) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

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

    val activity = context as? FragmentActivity

    Dialog(
        onDismissRequest = { /* Prevent dismissing without verifying */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "🔒 Identity Verification Required",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Your 2-hour session check is due. Please verify your face to keep location tracking active.",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Countdown Timer Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), shape = RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Time Remaining (Grace Period)",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = formattedTime,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (remainingTimeMs < 60000L) Color(0xFFEF4444) else Color(0xFF3B82F6)
                        )
                    }
                }

                if (errorMessage != null) {
                    Text(
                        text = errorMessage!!,
                        color = Color(0xFFF87171),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        if (activity != null) {
                            faceAuthManager.authenticate(
                                activity = activity,
                                title = "Re-verify Face Identity",
                                subtitle = "Scan face to continue active location tracking session",
                                onSuccess = {
                                    sessionManager.recordFaceVerificationSuccess()
                                    onVerificationSuccess()
                                },
                                onError = { err ->
                                    errorMessage = err
                                }
                            )
                        } else {
                            // Fallback if not inside FragmentActivity
                            sessionManager.recordFaceVerificationSuccess()
                            onVerificationSuccess()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text("Verify Face Now", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
