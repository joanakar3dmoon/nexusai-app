plugins { id "com.android.application" }
android {
    namespace "com.r3dm.nexusai"
    compileSdk 34
    defaultConfig {
        applicationId "com.r3dm.nexusai"
        minSdk 24
        targetSdk 34
        versionCode 2
        versionName "2.0"
    }
    buildTypes { debug { minifyEnabled false } }
}
dependencies { implementation "androidx.appcompat:appcompat:1.6.1" }
