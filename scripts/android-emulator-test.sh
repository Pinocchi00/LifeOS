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
./android/gradlew -p android --no-daemon --console=plain :app:connectedDebugAndroidTest
