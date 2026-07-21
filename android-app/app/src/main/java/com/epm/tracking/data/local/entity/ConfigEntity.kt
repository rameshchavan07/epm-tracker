package com.epm.tracking.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "config")
data class ConfigEntity(
    @PrimaryKey
    val id: Int = 1, // We only ever need one config row
    val companyId: String,
    val trackingMode: String, // e.g., "SHIFT", "ALWAYS_ON"
    val trackingIntervalSec: Int,
    val minimumAccuracyMeters: Int
)
