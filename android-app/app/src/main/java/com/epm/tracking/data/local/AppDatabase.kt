package com.epm.tracking.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.epm.tracking.data.local.dao.ConfigDao
import com.epm.tracking.data.local.dao.LocationDao
import com.epm.tracking.data.local.entity.ConfigEntity
import com.epm.tracking.data.local.entity.LocationEntity

@Database(entities = [ConfigEntity::class, LocationEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun configDao(): ConfigDao
    abstract fun locationDao(): LocationDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "epm_tracking_db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
