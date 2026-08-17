# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\xdrut\AppData\Local\Android\Sdk\tools\proguard\proguard-android.txt
# You can edit the include setting and change the file names in the
# build.gradle file.

# Keep Retrofit & Gson data models
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.epm.tracking.data.** { *; }
-keep class com.epm.tracking.data.local.entity.** { *; }

# Keep Room annotations & generated classes
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Keep TensorFlow Lite native JNI methods
-keep class org.tensorflow.lite.** { *; }
-keepclassmembers class * {
    native <methods>;
}
