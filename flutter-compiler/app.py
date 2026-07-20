import os, subprocess, tempfile, shutil, json
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

FLUTTER_BIN = "/flutter/bin/flutter"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "flutter": os.path.exists(FLUTTER_BIN)})

@app.route("/compile", methods=["POST"])
def compile_apk():
    data = request.get_json()
    if not data or "code" not in data:
        return jsonify({"error": "Missing code"}), 400

    dart_code = data["code"]
    app_name = data.get("name", "nexusai_app").lower().replace(" ", "_").replace("-", "_")
    app_name = "".join(c for c in app_name if c.isalnum() or c == "_") or "nexusai_app"

    work_dir = tempfile.mkdtemp(prefix="flutter_")
    try:
        lib_dir = os.path.join(work_dir, "lib")
        os.makedirs(lib_dir)

        # main.dart
        with open(os.path.join(lib_dir, "main.dart"), "w") as f:
            f.write(dart_code)

        # pubspec.yaml
        with open(os.path.join(work_dir, "pubspec.yaml"), "w") as f:
            f.write(f"""name: {app_name}
description: App generada por NexusAI
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
""")

        # Android dirs
        android_main = os.path.join(work_dir, "android", "app", "src", "main")
        os.makedirs(android_main, exist_ok=True)
        os.makedirs(os.path.join(android_main, "res", "values"), exist_ok=True)

        # AndroidManifest.xml
        with open(os.path.join(android_main, "AndroidManifest.xml"), "w") as f:
            f.write(f"""<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="{app_name}" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity" android:exported="true"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true" android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
    <uses-permission android:name="android.permission.INTERNET"/>
</manifest>""")

        # build.gradle app
        with open(os.path.join(work_dir, "android", "app", "build.gradle"), "w") as f:
            f.write("""plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}
android {
    namespace "com.nexusai.app"
    compileSdk flutter.compileSdkVersion
    ndkVersion flutter.ndkVersion
    defaultConfig {
        applicationId "com.nexusai.app"
        minSdk flutter.minSdkVersion
        targetSdk flutter.targetSdkVersion
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }
    buildTypes {
        release { signingConfig signingConfigs.debug }
    }
}
flutter { source "../.." }
""")

        # build.gradle root
        with open(os.path.join(work_dir, "android", "build.gradle"), "w") as f:
            f.write("""buildscript {
    ext.kotlin_version = '1.7.10'
    repositories { google(); mavenCentral() }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}
allprojects { repositories { google(); mavenCentral() } }
rootProject.buildDir = '../build'
subprojects { project.buildDir = "${rootProject.buildDir}/${project.name}" }
subprojects { project.evaluationDependsOn(':app') }
tasks.register("clean", Delete) { delete rootProject.buildDir }
""")

        # settings.gradle
        flutter_sdk = os.path.dirname(os.path.dirname(FLUTTER_BIN))
        with open(os.path.join(work_dir, "android", "settings.gradle"), "w") as f:
            f.write(f"""include ':app'
def localPropertiesFile = new File(rootProject.projectDir, "local.properties")
def properties = new Properties()
assert localPropertiesFile.exists()
localPropertiesFile.withReader("UTF-8") {{ reader -> properties.load(reader) }}
def flutterSdkPath = properties.getProperty("flutter.sdk")
assert flutterSdkPath != null
apply from: "$flutterSdkPath/packages/flutter_tools/gradle/app_plugin_loader.gradle"
""")

        # gradle.properties
        with open(os.path.join(work_dir, "android", "gradle.properties"), "w") as f:
            f.write("org.gradle.jvmargs=-Xmx1536M\nandroid.useAndroidX=true\nandroid.enableJetifier=true\n")

        # local.properties
        with open(os.path.join(work_dir, "android", "local.properties"), "w") as f:
            f.write(f"flutter.sdk={flutter_sdk}\nsdk.dir=/opt/android-sdk\n")

        # Compile
        env = os.environ.copy()
        env["PATH"] = f"/flutter/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/tools/bin:" + env.get("PATH", "")
        env["ANDROID_HOME"] = "/opt/android-sdk"
        env["ANDROID_SDK_ROOT"] = "/opt/android-sdk"

        result = subprocess.run(
            [FLUTTER_BIN, "build", "apk", "--release", "--no-pub"],
            cwd=work_dir, capture_output=True, text=True, timeout=240, env=env
        )

        if result.returncode != 0:
            return jsonify({"error": "Compilation failed", "stdout": result.stdout[-3000:], "stderr": result.stderr[-3000:]}), 500

        apk_path = os.path.join(work_dir, "build", "app", "outputs", "flutter-apk", "app-release.apk")
        if not os.path.exists(apk_path):
            return jsonify({"error": "APK not found after build"}), 500

        return send_file(apk_path, as_attachment=True, download_name=f"{app_name}.apk",
                         mimetype="application/vnd.android.package-archive")

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Compilation timeout (4 min)"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
