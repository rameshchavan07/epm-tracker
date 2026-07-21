package com.epm.tracking.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.epm.tracking.data.local.entity.ConfigEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ConfigDao {
    @Query("SELECT * FROM config WHERE id = 1 LIMIT 1")
    fun getConfig(): Flow<ConfigEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveConfig(config: ConfigEntity)
}
