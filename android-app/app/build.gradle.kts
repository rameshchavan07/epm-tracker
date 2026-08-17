plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.epm.tracking"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.epm.tracking"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Version catalog
    val coreKtxVersion = "1.12.0"
    val lifecycleVersion = "2.7.0"
    val activityComposeVersion = "1.8.2"
    val composeBomVersion = "2023.10.01"
    val junitVersion = "4.13.2"
    val androidxJunitVersion = "1.1.5"
    val espressoVersion = "3.5.1"
    val roomVersion = "2.6.1"
    val navVersion = "2.7.7"
    val locationVersion = "21.1.0"
    val coroutinesPlayVersion = "1.7.3"
    val retrofitVersion = "2.9.0"
    val workVersion = "2.9.0"
    val securityCryptoVersion = "1.1.0-alpha06"
    val biometricVersion = "1.1.0"
    val cameraxVersion = "1.4.1"
    val mlkitFaceVersion = "16.1.6"
    val tfliteVersion = "2.14.0"
    val tfliteSupportVersion = "0.4.4"

    // ── implementation ──────────────────────────────────────────────
    implementation(platform("androidx.compose:compose-bom:$composeBomVersion"))

    // AndroidX Core
    implementation("androidx.core:core-ktx:$coreKtxVersion")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:$lifecycleVersion")
    implementation("androidx.lifecycle:lifecycle-process:$lifecycleVersion")
    implementation("androidx.activity:activity-compose:$activityComposeVersion")

    // Jetpack Compose
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    // Navigation
    implementation("androidx.navigation:navigation-compose:$navVersion")

    // Room Database
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")

    // Location Services
    implementation("com.google.android.gms:play-services-location:$locationVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:$coroutinesPlayVersion")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:$retrofitVersion")
    implementation("com.squareup.retrofit2:converter-gson:$retrofitVersion")

    // Background Work & Security
    implementation("androidx.work:work-runtime-ktx:$workVersion")
    implementation("androidx.security:security-crypto:$securityCryptoVersion")
    implementation("androidx.biometric:biometric:$biometricVersion")

    // CameraX for face photo capture
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")

    // On-Device Face Detection & TensorFlow Lite Inference
    implementation("com.google.mlkit:face-detection:$mlkitFaceVersion")
    implementation("org.tensorflow:tensorflow-lite:$tfliteVersion")
    implementation("org.tensorflow:tensorflow-lite-support:$tfliteSupportVersion")

    // ── ksp ─────────────────────────────────────────────────────────
    ksp("androidx.room:room-compiler:$roomVersion")

    // ── testImplementation ──────────────────────────────────────────
    testImplementation("junit:junit:$junitVersion")

    // ── androidTestImplementation ───────────────────────────────────
    androidTestImplementation(platform("androidx.compose:compose-bom:$composeBomVersion"))
    androidTestImplementation("androidx.test.ext:junit:$androidxJunitVersion")
    androidTestImplementation("androidx.test.espresso:espresso-core:$espressoVersion")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")

    // ── debugImplementation ─────────────────────────────────────────
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
