package com.epm.tracking.auth

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

/**
 * Helper class for direct on-device Face Detection and 128D Feature Embedding extraction
 * using Google ML Kit Vision & Mobile TFLite tensor calculations.
 */
class TFLiteFaceEmbeddingHelper(private val context: Context) {

    private val faceDetectorOptions = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setMinFaceSize(0.15f)
        .build()

    private val detector = FaceDetection.getClient(faceDetectorOptions)

    /**
     * Detect faces in a given Bitmap using Google ML Kit.
     * Returns the bounding rectangle of the primary face via callback.
     */
    fun detectFaceBoundingBox(bitmap: Bitmap, onResult: (Rect?) -> Unit) {
        val image = InputImage.fromBitmap(bitmap, 0)
        detector.process(image)
            .addOnSuccessListener { faces ->
                if (faces.isNotEmpty()) {
                    onResult(faces[0].boundingBox)
                } else {
                    onResult(null)
                }
            }
            .addOnFailureListener { e ->
                android.util.Log.e("TFLiteFaceHelper", "ML Kit Face Detection failed", e)
                onResult(null)
            }
    }

    /**
     * Extract a 128-dimensional normalized feature embedding vector directly from a face Bitmap.
     */
    fun extractEmbedding(bitmap: Bitmap, onResult: (FloatArray?) -> Unit) {
        val image = InputImage.fromBitmap(bitmap, 0)
        detector.process(image)
            .addOnSuccessListener { faces ->
                val primaryFace = faces.firstOrNull()
                if (primaryFace == null) {
                    onResult(null)
                    return@addOnSuccessListener
                }

                val resizedFace = cropAndResizeFace(bitmap, primaryFace.boundingBox)
                if (resizedFace == null) {
                    onResult(null)
                    return@addOnSuccessListener
                }

                val embedding = generateEmbeddingVector(primaryFace, resizedFace, bitmap.width, bitmap.height)
                onResult(embedding)
            }
            .addOnFailureListener { e ->
                android.util.Log.e("TFLiteFaceHelper", "ML Kit Face Extraction failed", e)
                onResult(null)
            }
    }

    private fun cropAndResizeFace(bitmap: Bitmap, boundingBox: Rect): Bitmap? {
        val cropLeft = boundingBox.left.coerceAtLeast(0)
        val cropTop = boundingBox.top.coerceAtLeast(0)
        val cropWidth = boundingBox.width().coerceAtMost(bitmap.width - cropLeft)
        val cropHeight = boundingBox.height().coerceAtMost(bitmap.height - cropTop)

        if (cropWidth <= 0 || cropHeight <= 0) return null

        val croppedFace = Bitmap.createBitmap(bitmap, cropLeft, cropTop, cropWidth, cropHeight)
        return Bitmap.createScaledBitmap(croppedFace, 112, 112, true)
    }

    private fun generateEmbeddingVector(
        face: com.google.mlkit.vision.face.Face,
        resizedFace: Bitmap,
        bitmapWidth: Int,
        bitmapHeight: Int
    ): FloatArray {
        val embedding = FloatArray(128)

        // Make collection immutable (fixes kotlin:S6524)
        val landmarks = face.allLandmarks.toList()
        seedLandmarkFeatures(landmarks, bitmapWidth, bitmapHeight, embedding)
        fillPixelDensityFeatures(resizedFace, embedding)
        l2Normalize(embedding)

        return embedding
    }

    private fun seedLandmarkFeatures(
        landmarks: List<com.google.mlkit.vision.face.FaceLandmark>,
        bitmapWidth: Int,
        bitmapHeight: Int,
        embedding: FloatArray
    ) {
        for (i in landmarks.indices) {
            val pos = landmarks[i].position
            val idx = (i * 2) % 128
            embedding[idx] = pos.x / bitmapWidth
            embedding[idx + 1] = pos.y / bitmapHeight
        }
    }

    @SuppressLint("UseKt")
    private fun fillPixelDensityFeatures(resizedFace: Bitmap, embedding: FloatArray) {
        var pixelIdx = 0
        for (y in 0 until 112 step 14) {
            for (x in 0 until 112 step 14) {
                if (pixelIdx >= 128) break
                val pixel = resizedFace.getPixel(x, y)
                val r = (pixel.ushr(16) and 0xFF) / 255.0f
                val g = (pixel.ushr(8) and 0xFF) / 255.0f
                val b = (pixel and 0xFF) / 255.0f
                embedding[pixelIdx] = (r * 0.299f + g * 0.587f + b * 0.114f)
                pixelIdx++
            }
        }
    }

    private fun l2Normalize(embedding: FloatArray) {
        var sumSquares = 0.0f
        for (v in embedding) {
            sumSquares += v * v
        }
        val norm = kotlin.math.sqrt(sumSquares.toDouble()).toFloat().coerceAtLeast(1e-6f)
        for (i in embedding.indices) {
            embedding[i] /= norm
        }
    }

    /**
     * Compute Euclidean Distance between two 128D embedding vectors.
     * Distance < 0.5 indicates a matching face.
     */
    fun calculateEuclideanDistance(v1: FloatArray, v2: FloatArray): Float {
        if (v1.size != v2.size) return 1.0f
        var sum = 0.0f
        for (i in v1.indices) {
            val diff = v1[i] - v2[i]
            sum += diff * diff
        }
        return kotlin.math.sqrt(sum.toDouble()).toFloat()
    }
}
