#!/usr/bin/env bash
# Build a locally signed *demo* APK. See README for requirements and limitations.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_JAR:?Set ANDROID_JAR to an Android platform android.jar (API 34 or newer)}"
: "${ANDROID_BUILD_TOOLS:?Set ANDROID_BUILD_TOOLS to an Android build-tools directory}"
TOOLS_BIN="$ANDROID_BUILD_TOOLS"
[[ -d "$ANDROID_BUILD_TOOLS/bin" ]] && TOOLS_BIN="$ANDROID_BUILD_TOOLS/bin"
: "${JAVA_HOME:?Set JAVA_HOME to a Java runtime or JDK}"
JAVA="$JAVA_HOME/bin/java"
KEYTOOL="$JAVA_HOME/bin/keytool"
BUILD=android/build
KEYSTORE=${DEMO_KEYSTORE:-android/demo.keystore}
mkdir -p "$BUILD" releases
rm -rf "$BUILD/assets" "$BUILD/classes" "$BUILD/dex" "$BUILD/compiled"
mkdir -p "$BUILD/assets/web" "$BUILD/classes" "$BUILD/dex" "$BUILD/compiled"
NATIVE_ANDROID=1 npm run build
cp -R dist/. "$BUILD/assets/web/"
"$TOOLS_BIN/aapt2" compile --dir android/res -o "$BUILD/compiled/resources.zip"
"$TOOLS_BIN/aapt2" link -I "$ANDROID_JAR" --manifest android/AndroidManifest.xml -A "$BUILD/assets" -o "$BUILD/unsigned.apk" "$BUILD/compiled/resources.zip"
if [[ -n "${ECJ_JAR:-}" ]]; then
  "$JAVA" -jar "$ECJ_JAR" -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" -d "$BUILD/classes" android/src/com/hamrahsalamat/app/MainActivity.java
else
  "$JAVA_HOME/bin/javac" -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" -d "$BUILD/classes" android/src/com/hamrahsalamat/app/MainActivity.java
fi
"$JAVA" -cp "$ANDROID_BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.D8 --min-api 24 --lib "$ANDROID_JAR" --output "$BUILD/dex" $(find "$BUILD/classes" -name '*.class')
(cd "$BUILD/dex" && zip -q ../unsigned.apk classes.dex)
"$TOOLS_BIN/zipalign" -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [[ ! -f "$KEYSTORE" ]]; then
  "$KEYTOOL" -genkeypair -keystore "$KEYSTORE" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Demo, O=Hamrah Salamat, C=US'
fi
"$JAVA" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out releases/hamrah-salamat-demo.apk "$BUILD/aligned.apk"
"$JAVA" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" verify --verbose releases/hamrah-salamat-demo.apk
printf '\nDemo APK: releases/hamrah-salamat-demo.apk\n'
