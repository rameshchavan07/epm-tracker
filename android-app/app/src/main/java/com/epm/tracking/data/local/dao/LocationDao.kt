package com.epm.tracking.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.epm.tracking.data.local.entity.LocationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LocationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(location: LocationEntity)

    @Query("SELECT * FROM location_logs WHERE isSynced = 0 ORDER BY timestamp ASC")
    fun getUnsyncedLocations(): Flow<List<LocationEntity>>

    @Query("UPDATE location_logs SET isSynced = 1 WHERE id IN (:locationIds)")
    suspend fun markAsSynced(locationIds: List<Long>)

    @Query("DELETE FROM location_logs WHERE isSynced = 1 AND timestamp < :timestampLimit")
    suspend fun deleteOldSyncedLocations(timestampLimit: Long)
}
