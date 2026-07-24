package com.epm.tracking.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_logs")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: String,
    val deviceId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val address: String? = null,
    val intervalMinutes: Int? = null,
    val timestamp: Long, // Epoch milliseconds
    val isSynced: Boolean = false
)
