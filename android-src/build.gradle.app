plugins { id "com.android.application" }
android {
    namespace "com.r3dm.nexusai"
    compileSdk 34
    defaultConfig {
        applicationId "com.r3dm.nexusai"
        minSdk 24
        targetSdk 34
        versionCode 3
        versionName "2.1"
    }
    buildTypes { debug { minifyEnabled false } }
}
dependencies {
    implementation "androidx.appcompat:appcompat:1.6.1"
    implementation "com.google.android.gms:play-services-ads:23.0.0"
}
