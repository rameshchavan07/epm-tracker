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
import kotlinx.coroutines.launch

@Composable
fun LogoutVerificationDialog(
    sessionManager: SessionManager,
    onVerificationSuccess: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val faceAuthManager = remember { FaceAuthManager(context) }
    val coroutineScope = rememberCoroutineScope()

    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isProcessing by remember { mutableStateOf(false) }
    
    val activity = context as? androidx.fragment.app.FragmentActivity

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🔒 Logout Verification Required",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = Color(0xFF94A3B8), fontSize = 14.sp)
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Verify your face to confirm identity and complete logout.",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Embedded camera for face capture
                FaceCaptureCamera(
                    isCapturing = isProcessing,
                    captureButtonText = "Scan Face to Logout",
                    onImageCaptured = { base64Image ->
                        isProcessing = true
                        errorMessage = null

                        coroutineScope.launch {
                            val userId = sessionManager.getUserId() ?: "unknown"

                            android.util.Log.d("EPM_FACE_LOG", "Starting logout face verification for User ID: $userId")
                            // Try server-side verification first
                            val result = faceAuthManager.verifyFaceWithServer(userId, base64Image)

                            if (result != null && result.match) {
                                android.util.Log.i("EPM_FACE_LOG", "Logout face verification succeeded! Confidence: ${result.confidence}%")
                                isProcessing = false
                                onVerificationSuccess()
                            } else if (result != null) {
                                android.util.Log.w("EPM_FACE_LOG", "Logout face verification failed! Confidence: ${result.confidence}% - Server message: ${result.message}")
                                isProcessing = false
                                errorMessage = if (result.confidence == 0) {
                                    result.message
                                } else {
                                    "Face does not match (${result.confidence}% confidence). Try again."
                                }
                            } else {
                                android.util.Log.e("EPM_FACE_LOG", "Server unreachable on logout. Attempting offline local biometric fallback...")
                                // Network error — fallback to local biometric
                                isProcessing = false
                                if (activity != null) {
                                    faceAuthManager.authenticate(
                                        activity = activity,
                                        title = "Verify Identity to Logout",
                                        subtitle = "Server unreachable. Using local biometric verification.",
                                        onSuccess = {
                                            android.util.Log.i("EPM_FACE_LOG", "Offline logout biometric verification succeeded!")
                                            onVerificationSuccess()
                                        },
                                        onError = { err ->
                                            android.util.Log.e("EPM_FACE_LOG", "Offline logout biometric verification failed: $err")
                                            errorMessage = "Offline verification failed: $err"
                                        }
                                    )
                                } else {
                                    android.util.Log.e("EPM_FACE_LOG", "Offline logout biometric fallback unavailable (null Activity)")
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
