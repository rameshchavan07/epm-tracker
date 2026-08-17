package com.epm.tracking.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_logs")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val employeeCode: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val address: String? = null,
    val timestamp: Long,
    val isSynced: Boolean = false
)
