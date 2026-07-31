package com.epm.tracking.service

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object BuzzerManager {
    fun playBuzzer(context: Context) {
        try {
            // 1. Play Tone (system notification stream)
            val toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            // Play a high-alert tone (e.g. Call guard / multi-beep)
            toneGenerator.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 350)
            
            // 2. Vibrate
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            vibrator?.let {
                if (it.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        // Vibrate with pattern: vibrate for 300ms, pause for 100ms, vibrate for 300ms
                        val pattern = longArrayOf(0, 300, 100, 300)
                        val amplitudes = intArrayOf(0, VibrationEffect.DEFAULT_AMPLITUDE, 0, VibrationEffect.DEFAULT_AMPLITUDE)
                        it.vibrate(VibrationEffect.createWaveform(pattern, amplitudes, -1))
                    } else {
                        @Suppress("DEPRECATION")
                        it.vibrate(longArrayOf(0, 300, 100, 300), -1)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
