#!/usr/bin/env bash
set -euo pipefail
# This script runs only in the workflow's fresh, synthetic-data emulator.
mkdir -p artifacts
capture() {
  adb exec-out screencap -p > artifacts/LifeOS-Android.png || true
  adb logcat -d -v threadtime > artifacts/android-logcat.txt || true
}
trap capture EXIT
adb shell svc wifi disable
adb shell svc data disable
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# AndroidJUnitRunner executes the compiled test directly. No second Gradle/UTP
# dependency resolution is needed after the build has already been verified.
adb shell am instrument -w -r -e class fr.lifeos.personal.NativeSmokeTest \
  fr.lifeos.personal.test/androidx.test.runner.AndroidJUnitRunner \
  | tee artifacts/android-instrumentation.txt
grep -Eq 'OK \([1-9][0-9]* tests?\)' artifacts/android-instrumentation.txt
