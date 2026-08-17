package com.epm.tracking.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import kotlin.coroutines.resume

object BackgroundCameraHelper {

    private val cameraExecutor = Executors.newSingleThreadExecutor()

    suspend fun captureFaceInBackground(context: Context): String? {
        return suspendCancellableCoroutine { continuation ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()

                    val imageCapture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    val cameraSelector = CameraSelector.Builder()
                        .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
                        .build()

                    // Bind to application lifecycle using ProcessLifecycleOwner
                    val lifecycleOwner = ProcessLifecycleOwner.get()
                    
                    // Ensure camera is unbound from previous instances
                    cameraProvider.unbindAll()
                    
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        imageCapture
                    )

                    // Capture image
                    imageCapture.takePicture(
                        cameraExecutor,
                        object : ImageCapture.OnImageCapturedCallback() {
                            override fun onCaptureSuccess(imageProxy: ImageProxy) {
                                try {
                                    val bitmap = imageProxyToBitmap(imageProxy)
                                    val resized = resizeBitmap(bitmap, 640)
                                    val base64 = bitmapToBase64(resized, 80)
                                    imageProxy.close()
                                    
                                    // Clean up and release camera on main thread
                                    ContextCompat.getMainExecutor(context).execute {
                                        cameraProvider.unbindAll()
                                    }
                                    
                                    if (continuation.isActive) {
                                        continuation.resume(base64)
                                    }
                                } catch (e: Exception) {
                                    imageProxy.close()
                                    ContextCompat.getMainExecutor(context).execute {
                                        cameraProvider.unbindAll()
                                    }
                                    if (continuation.isActive) {
                                        continuation.resume(null)
                                    }
                                }
                            }

                            override fun onError(exception: ImageCaptureException) {
                                ContextCompat.getMainExecutor(context).execute {
                                    cameraProvider.unbindAll()
                                }
                                if (continuation.isActive) {
                                    continuation.resume(null)
                                }
                            }
                        }
                    )

                } catch (e: Exception) {
                    if (continuation.isActive) {
                        continuation.resume(null)
                    }
                }
            }, ContextCompat.getMainExecutor(context))
        }
    }

    private fun imageProxyToBitmap(imageProxy: ImageProxy): Bitmap {
        val buffer = imageProxy.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)

        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            ?: throw IllegalStateException("Failed to decode image")

        val rotationDegrees = imageProxy.imageInfo.rotationDegrees.toFloat()
        val matrix = Matrix().apply {
            postRotate(rotationDegrees)
            postScale(-1f, 1f, bitmap.width / 2f, bitmap.height / 2f) // Mirror front camera
        }

        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun resizeBitmap(bitmap: Bitmap, maxWidth: Int): Bitmap {
        if (bitmap.width <= maxWidth) return bitmap
        val ratio = maxWidth.toFloat() / bitmap.width.toFloat()
        val newHeight = (bitmap.height * ratio).toInt()
        return Bitmap.createScaledBitmap(bitmap, maxWidth, newHeight, true)
    }

    private fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
