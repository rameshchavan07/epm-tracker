package com.epm.tracking.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import com.epm.tracking.auth.FaceAuthManager
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.SessionManager
import com.epm.tracking.data.ValidateEmployeeRequest
import com.epm.tracking.ui.components.FaceCaptureCamera
import com.epm.tracking.location.getOneTimeLocation
import kotlinx.coroutines.launch
import android.provider.Settings
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.*
import androidx.compose.animation.core.*

@Composable
fun LoginScreen(
    sessionManager: SessionManager,
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    val faceAuthManager = remember { FaceAuthManager(context) }
    val coroutineScope = rememberCoroutineScope()

    var isProcessing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showCamera by remember { mutableStateOf(false) }
    var isVisible by remember { mutableStateOf(false) }

    // Registration Flow States
    var showRegistrationUI by remember { mutableStateOf(false) }
    var showRegisterOption by remember { mutableStateOf(false) } // Appears ONLY after face scan returns Face Not Found
    var inputEmployeeCode by remember { mutableStateOf("") }
    var isValidatingCode by remember { mutableStateOf(false) }
    var validatedEmployeeName by remember { mutableStateOf<String?>(null) }
    var isCodeValidated by remember { mutableStateOf(false) }

    val isFaceEnrolled = remember { sessionManager.isFaceEnrolled() }
    val savedEmployeeCode = remember { sessionManager.getEmployeeCode() }

    LaunchedEffect(Unit) {
        isVisible = true
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

    val gradientBackground = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF020617)
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
                    .fillMaxWidth(0.92f)
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
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Brand Logo Badge Header (rendered for Login mode, hidden for Registration mode to free vertical space)
                    if (!showRegistrationUI) {
                        Surface(
                            modifier = Modifier
                                .size(68.dp)
                                .padding(bottom = 12.dp),
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
                                    modifier = Modifier.size(34.dp)
                                )
                            }
                        }

                        Text(
                            text = "EPM Tracker",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        Text(
                            text = if (isFaceEnrolled && !savedEmployeeCode.isNull_or_blank_check()) "Face ID Authentication (${savedEmployeeCode})" else "Employee Face Login",
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.padding(bottom = 20.dp)
                        )
                    } else {
                        // Compact Registration Header
                        Text(
                            text = "New Employee Registration",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )
                    }


                    // 1. REGISTRATION MODE (Entered Employee Code Verification)
                    if (showRegistrationUI) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            OutlinedTextField(
                                value = inputEmployeeCode,
                                onValueChange = {
                                    inputEmployeeCode = it
                                    isCodeValidated = false
                                    validatedEmployeeName = null
                                    error = null
                                },
                                label = { Text("Enter Your Employee Code", color = Color(0xFF94A3B8)) },
                                placeholder = { Text("e.g. EMP001", color = Color(0xFF64748B)) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF3B82F6),
                                    unfocusedBorderColor = Color(0xFF475569)
                                )
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            if (!isCodeValidated) {
                                Button(
                                    onClick = {
                                        if (inputEmployeeCode.isBlank()) {
                                            error = "Please enter an employee code"
                                            return@Button
                                        }
                                        isValidatingCode = true
                                        error = null

                                        coroutineScope.launch {
                                            try {
                                                val response = ApiClient.getService().validateEmployee(
                                                    ValidateEmployeeRequest(employeeCode = inputEmployeeCode.trim())
                                                )
                                                isValidatingCode = false
                                                if (response.valid) {
                                                    isCodeValidated = true
                                                    validatedEmployeeName = response.name ?: "Employee ${inputEmployeeCode.trim()}"
                                                    error = null
                                                } else {
                                                    isCodeValidated = false
                                                    error = response.message ?: "Employee code does not exist"
                                                }
                                            } catch (e: Exception) {
                                                isValidatingCode = false
                                                error = "Employee code validation failed: ${e.message}"
                                            }
                                        }
                                    },
                                    enabled = !isValidatingCode && inputEmployeeCode.isNotBlank(),
                                    modifier = Modifier.fillMaxWidth().height(48.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                                ) {
                                    if (isValidatingCode) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                                    } else {
                                        Text("Validate Employee Code", fontWeight = FontWeight.Bold)
                                    }
                                }
                            } else {
                                // Validated employee card display
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF065F46).copy(alpha = 0.3f)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = "Valid", tint = Color(0xFF34D399), modifier = Modifier.size(24.dp))
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text(text = "Employee Code: ${inputEmployeeCode.trim().uppercase()}", fontSize = 12.sp, color = Color(0xFF94A3B8))
                                            Text(text = "Name: ${validatedEmployeeName ?: ""}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                if (!showCamera) {
                                    Button(
                                        onClick = { showCamera = true },
                                        modifier = Modifier.fillMaxWidth().height(50.dp),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                                    ) {
                                        Text("📷 Scan Face", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    }
                                }
                            }
                        }
                    }

                    // 2. CAMERA CAPTURE VIEW
                    if (showCamera) {
                        val activeEmpCode = if (showRegistrationUI) inputEmployeeCode.trim() else (savedEmployeeCode ?: "")

                        FaceCaptureCamera(
                            isCapturing = isProcessing,
                            captureButtonText = if (showRegistrationUI) "👤 Capture Face to Register Profile" else "👤 Capture Face to Log In",
                            onImageCaptured = { base64Image ->
                                isProcessing = true
                                error = null

                                coroutineScope.launch {
                                    val locationPair = context.getOneTimeLocation()
                                    val lat = locationPair?.first
                                    val lon = locationPair?.second

                                    if (showRegistrationUI) {
                                        // Registration / Enrollment for validated employee code
                                        android.util.Log.d("EPM_FACE_LOG", "Registering face profile on server for Employee Code: $activeEmpCode")
                                        val enrollResult = faceAuthManager.enrollFaceWithServer(
                                            employeeCode = activeEmpCode,
                                            base64Image = base64Image,
                                            latitude = lat,
                                            longitude = lon
                                        )

                                        if (enrollResult.first) {
                                            sessionManager.saveEmployeeCode(activeEmpCode)
                                            validatedEmployeeName?.let { sessionManager.saveEmployeeName(it) }
                                            sessionManager.saveFaceEnrolled(true)
                                            sessionManager.saveAuthToken("face_auth_token")
                                            sessionManager.recordFaceVerificationSuccess()
                                            isProcessing = false
                                            onLoginSuccess()
                                        } else {
                                            isProcessing = false
                                            error = if (!enrollResult.second.isNullOrBlank()) {
                                                enrollResult.second
                                            } else {
                                                "Face enrollment failed. Please ensure your face is clearly visible and try again."
                                            }
                                        }
                                    } else {
                                        // Existing User Verification
                                        android.util.Log.d("EPM_FACE_LOG", "Verifying face profile on server for Employee Code: $activeEmpCode")
                                        val result = faceAuthManager.verifyFaceWithServer(
                                            employeeCode = activeEmpCode,
                                            base64Image = base64Image,
                                            latitude = lat,
                                            longitude = lon
                                        )


                                        if (result != null && result.match) {
                                            sessionManager.saveEmployeeCode(result.employeeCode ?: activeEmpCode)
                                            sessionManager.saveFaceEnrolled(true)
                                            sessionManager.saveAuthToken("face_auth_token")
                                            sessionManager.recordFaceVerificationSuccess()
                                            isProcessing = false
                                            onLoginSuccess()
                                        } else if (result != null) {
                                            isProcessing = false
                                            sessionManager.clearSession()
                                            showRegisterOption = true // Show "Register Yourself" option ONLY after Face Not Found
                                            error = "Face Not Found / Match Failed (${result.confidence}%). " + (result.message ?: "")
                                        } else {
                                            // Offline biometric fallback
                                            isProcessing = false
                                            showRegisterOption = true // Show "Register Yourself" option if server unreachable or face not registered
                                            val activity = context as? androidx.fragment.app.FragmentActivity
                                            if (activity != null) {
                                                faceAuthManager.authenticate(
                                                    activity = activity,
                                                    title = "Offline Face Login",
                                                    subtitle = "Server unreachable. Using local biometric verification.",
                                                    onSuccess = {
                                                        sessionManager.saveEmployeeCode(activeEmpCode)
                                                        sessionManager.saveAuthToken("face_auth_token")
                                                        sessionManager.recordFaceVerificationSuccess()
                                                        onLoginSuccess()
                                                    },
                                                    onError = { err ->
                                                        error = "Offline verification failed: $err"
                                                    }
                                                )
                                            } else {
                                                error = "Server unreachable and biometric fallback unavailable."
                                            }
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else if (!showRegistrationUI) {
                        // INITIAL SCREEN STATE (Normal face scan button only)
                        Button(
                            onClick = { showCamera = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                        ) {
                            Text(
                                text = "👤 Open Camera to Log In",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }

                    // "Register Yourself" button appears ONLY after normal face scan returns "Face Not Found"
                    if (showRegisterOption && !showRegistrationUI) {
                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedButton(
                            onClick = {
                                showRegistrationUI = true
                                showCamera = false
                                error = null
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = Brush.horizontalGradient(listOf(Color(0xFF60A5FA), Color(0xFF3B82F6))))
                        ) {
                            Icon(Icons.Default.Person, contentDescription = "Register", tint = Color(0xFF60A5FA), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "Register Yourself (New Employee)", color = Color(0xFF60A5FA), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        }
                    }

                    if (error != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = "Error", tint = Color(0xFFF87171), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = error!!,
                                color = Color(0xFFF87171),
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_blank_check(): Boolean = this.isNullOrBlank()
