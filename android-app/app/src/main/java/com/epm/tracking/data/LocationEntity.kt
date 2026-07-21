package com.epm.tracking.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_logs")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: Long
)
