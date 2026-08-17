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
    fun insertLocation(location: LocationEntity)

    // One-shot query — used by SyncWorker/TrackingService to read pending rows
    @Query("SELECT * FROM location_logs WHERE isSynced = 0 ORDER BY timestamp ASC LIMIT 200")
    fun getUnsyncedLocations(): List<LocationEntity>

    @Query("UPDATE location_logs SET isSynced = 1 WHERE id IN (:locationIds)")
    fun markAsSynced(locationIds: List<Long>): Int

    // Delete synced rows by ID after a successful upload
    @Query("DELETE FROM location_logs WHERE id IN (:locationIds)")
    fun deleteLocations(locationIds: List<Long>): Int

    @Query("DELETE FROM location_logs WHERE isSynced = 1 AND timestamp < :timestampLimit")
    fun deleteOldSyncedLocations(timestampLimit: Long): Int

    @Query("SELECT COUNT(*) FROM location_logs WHERE isSynced = 0")
    fun getUnsyncedCount(): Flow<Int>
}
