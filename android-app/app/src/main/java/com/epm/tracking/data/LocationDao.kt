package com.epm.tracking.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface LocationDao {
    @Insert
    suspend fun insertLocation(location: LocationEntity)

    @Query("SELECT * FROM location_logs ORDER BY timestamp ASC LIMIT :limit")
    suspend fun getUnsyncedLocations(limit: Int = 50): List<LocationEntity>

    @Query("DELETE FROM location_logs WHERE id IN (:ids)")
    suspend fun deleteLocations(ids: List<Int>)
}
