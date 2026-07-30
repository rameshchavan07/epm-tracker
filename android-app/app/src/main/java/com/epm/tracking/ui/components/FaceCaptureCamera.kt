package com.epm.tracking.ui.components

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.compose.ui.platform.LocalLifecycleOwner
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

/**
 * Reusable CameraX-based face capture composable.
 *
 * Shows a front-camera preview with an oval face guide overlay.
 * When the user taps the capture button, it takes a JPEG photo,
 * compresses and resizes it, then returns the Base64 string via onImageCaptured.
 *
 * @param isCapturing Whether a capture is currently in progress (shows loading state)
 * @param onImageCaptured Callback with the Base64-encoded JPEG image string
 * @param captureButtonText Text shown on the capture button
 * @param modifier Modifier for the outer container
 */
@Composable
fun FaceCaptureCamera(
    isCapturing: Boolean = false,
    onImageCaptured: (String) -> Unit,
    captureButtonText: String = "📷 Capture Face",
    modifier: Modifier = Modifier
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var isTakingPhoto by remember { mutableStateOf(false) }
    var cameraError by remember { mutableStateOf<String?>(null) }

    // Animated scanning line
    val infiniteTransition = rememberInfiniteTransition(label = "scan")
    val scanLineY by infiniteTransition.animateFloat(
        initialValue = 0.15f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scanLine"
    )

    // Pulsing border animation
    val borderAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "borderPulse"
    )

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Camera preview with oval overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 4f)
                .background(Color(0xFF0F172A), shape = RoundedCornerShape(24.dp)),
            contentAlignment = Alignment.Center
        ) {
            // CameraX Preview
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                    }

                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        try {
                            val cameraProvider = cameraProviderFuture.get()

                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            val imageCaptureBuilder = ImageCapture.Builder()
                                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                                .setTargetRotation(previewView.display?.rotation ?: 0)

                            imageCapture = imageCaptureBuilder.build()

                            val cameraSelector = CameraSelector.Builder()
                                .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
                                .build()

                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                cameraSelector,
                                preview,
                                imageCapture
                            )
                        } catch (e: Exception) {
                            cameraError = "Camera init failed: ${e.message}"
                        }
                    }, ContextCompat.getMainExecutor(ctx))

                    previewView
                },
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF1E293B), shape = RoundedCornerShape(24.dp))
            )

            // Oval face guide overlay + scanning line
            Canvas(modifier = Modifier.fillMaxSize()) {
                val ovalWidth = size.width * 0.6f
                val ovalHeight = size.height * 0.65f
                val ovalLeft = (size.width - ovalWidth) / 2
                val ovalTop = (size.height - ovalHeight) / 2

                // Semi-transparent mask around the oval
                val path = Path().apply {
                    addRect(Rect(0f, 0f, size.width, size.height))
                    addOval(
                        Rect(
                            ovalLeft, ovalTop,
                            ovalLeft + ovalWidth, ovalTop + ovalHeight
                        )
                    )
                }
                drawPath(
                    path = path,
                    color = Color(0xFF0F172A).copy(alpha = 0.6f),
                    blendMode = BlendMode.SrcOver
                )

                // Oval border
                drawOval(
                    color = Color(0xFF60A5FA).copy(alpha = borderAlpha),
                    topLeft = Offset(ovalLeft, ovalTop),
                    size = Size(ovalWidth, ovalHeight),
                    style = Stroke(width = 3.dp.toPx())
                )

                // Scanning line (only while not capturing)
                if (!isTakingPhoto && !isCapturing) {
                    val lineY = ovalTop + ovalHeight * scanLineY
                    if (lineY in ovalTop..ovalTop + ovalHeight) {
                        // Calculate the width of the oval at this Y position
                        val relativeY = (lineY - ovalTop) / ovalHeight
                        val normalizedY = (relativeY - 0.5f) * 2f // -1 to 1
                        val lineHalfWidth =
                            (ovalWidth / 2f) * kotlin.math.sqrt((1f - normalizedY * normalizedY).coerceAtLeast(0f))
                        val lineCenterX = size.width / 2f

                        drawLine(
                            brush = Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color(0xFF60A5FA).copy(alpha = 0.8f),
                                    Color(0xFF3B82F6),
                                    Color(0xFF60A5FA).copy(alpha = 0.8f),
                                    Color.Transparent
                                ),
                                startX = lineCenterX - lineHalfWidth,
                                endX = lineCenterX + lineHalfWidth
                            ),
                            start = Offset(lineCenterX - lineHalfWidth, lineY),
                            end = Offset(lineCenterX + lineHalfWidth, lineY),
                            strokeWidth = 3.dp.toPx()
                        )
                    }
                }
            }

            // Camera error message
            if (cameraError != null) {
                Text(
                    text = cameraError!!,
                    color = Color(0xFFF87171),
                    fontSize = 12.sp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Capture button
        if (isCapturing || isTakingPhoto) {
            CircularProgressIndicator(
                color = Color(0xFF3B82F6),
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (isTakingPhoto) "Capturing..." else "Verifying face...",
                color = Color(0xFF60A5FA),
                fontSize = 14.sp
            )
        } else {
            Button(
                onClick = {
                    val capture = imageCapture ?: return@Button
                    isTakingPhoto = true
                    cameraError = null

                    capture.takePicture(
                        cameraExecutor,
                        object : ImageCapture.OnImageCapturedCallback() {
                            override fun onCaptureSuccess(imageProxy: ImageProxy) {
                                try {
                                    val bitmap = imageProxyToBitmap(imageProxy)
                                    val resized = resizeBitmap(bitmap, 640)
                                    val base64 = bitmapToBase64(resized, 80)
                                    imageProxy.close()

                                    // Switch back to main thread
                                    android.os.Handler(android.os.Looper.getMainLooper()).post {
                                        isTakingPhoto = false
                                        onImageCaptured(base64)
                                    }
                                } catch (e: Exception) {
                                    imageProxy.close()
                                    android.os.Handler(android.os.Looper.getMainLooper()).post {
                                        isTakingPhoto = false
                                        cameraError = "Failed to process image: ${e.message}"
                                    }
                                }
                            }

                            override fun onError(exception: ImageCaptureException) {
                                android.os.Handler(android.os.Looper.getMainLooper()).post {
                                    isTakingPhoto = false
                                    cameraError = "Capture failed: ${exception.message}"
                                }
                            }
                        }
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                enabled = imageCapture != null
            ) {
                Text(
                    captureButtonText,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}

/**
 * Convert an ImageProxy (from CameraX) to a Bitmap.
 * Handles rotation correction for front camera.
 */
private fun imageProxyToBitmap(imageProxy: ImageProxy): Bitmap {
    val buffer = imageProxy.planes[0].buffer
    val bytes = ByteArray(buffer.remaining())
    buffer.get(bytes)

    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        ?: throw IllegalStateException("Failed to decode image")

    // Apply rotation
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees.toFloat()
    val matrix = Matrix().apply {
        postRotate(rotationDegrees)
        // Mirror for front camera
        postScale(-1f, 1f, bitmap.width / 2f, bitmap.height / 2f)
    }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}

/**
 * Resize a bitmap to fit within maxWidth while maintaining aspect ratio.
 */
private fun resizeBitmap(bitmap: Bitmap, maxWidth: Int): Bitmap {
    if (bitmap.width <= maxWidth) return bitmap
    val ratio = maxWidth.toFloat() / bitmap.width.toFloat()
    val newHeight = (bitmap.height * ratio).toInt()
    return Bitmap.createScaledBitmap(bitmap, maxWidth, newHeight, true)
}

/**
 * Compress a bitmap to JPEG and encode to Base64 string.
 */
private fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
    val bytes = outputStream.toByteArray()
    return Base64.encodeToString(bytes, Base64.NO_WRAP)
}
