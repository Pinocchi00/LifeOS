#!/usr/bin/env bash
set -euo pipefail
# This script runs only in the workflow's fresh, synthetic-data emulator.
mkdir -p artifacts
fixture_pid=""
capture() {
  if [ -n "$fixture_pid" ]; then kill "$fixture_pid" 2>/dev/null || true; fi
  adb exec-out screencap -p > artifacts/LifeOS-Android.png || true
  adb logcat -d -v threadtime > artifacts/android-logcat.txt || true
  for image in native-home.png native-failure.png native-reminders.png native-adaptation.png native-github.png native-ai-claude.png native-eco-explorer.png native-eco-projects.png native-https-cert-refused.png native-https-github.png native-https-consent.png native-https-offline.png; do
    adb pull "/sdcard/Android/data/fr.lifeos.personal/files/$image" "artifacts/$image" || true
  done
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
bash scripts/assert-android-runner.sh artifacts/android-instrumentation.txt

# A second clean synthetic profile exercises real native HTTPS via ADB loopback.
# Only the instrumentation APK supplies fixture trust; the installed app rejects it first.
capture
adb shell am force-stop fr.lifeos.personal
adb shell pm clear fr.lifeos.personal
node scripts/native-fixture.mjs > artifacts/native-fixture.txt 2>&1 &
fixture_pid=$!
for attempt in $(seq 1 30); do
  if curl --silent --insecure --fail https://127.0.0.1:4182/ > /dev/null; then break; fi
  sleep 1
done
adb reverse tcp:4182 tcp:4182
adb shell am instrument -w -r -e class 'fr.lifeos.personal.NativeConnectorTest#nativeHttpsConnector' \
  fr.lifeos.personal.test/androidx.test.runner.AndroidJUnitRunner \
  | tee artifacts/native-connector-instrumentation.txt
bash scripts/assert-android-runner.sh artifacts/native-connector-instrumentation.txt
