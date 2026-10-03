#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$PWD/.android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
mkdir -p .tools/device-test app/src/debug/res/{raw,xml}
cleanup() {
  [[ -n "${server_pid:-}" ]] && kill "$server_pid" 2>/dev/null || true
  rm -f app/src/debug/AndroidManifest.xml app/src/debug/res/xml/local_test_security.xml app/src/debug/res/raw/local_test_ca.pem
}
trap cleanup EXIT
openssl req -x509 -newkey rsa:2048 -nodes -keyout .tools/device-test/key.pem -out .tools/device-test/cert.pem \
  -days 1 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost' >/dev/null 2>&1
cp .tools/device-test/cert.pem app/src/debug/res/raw/local_test_ca.pem
cat > app/src/debug/AndroidManifest.xml <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:networkSecurityConfig="@xml/local_test_security" />
</manifest>
EOF
cat > app/src/debug/res/xml/local_test_security.xml <<'EOF'
<network-security-config>
  <domain-config>
    <domain>localhost</domain>
    <trust-anchors><certificates src="@raw/local_test_ca" /></trust-anchors>
  </domain-config>
</network-security-config>
EOF
node scripts/device-test-server.mjs > .tools/device-test/server.log 2>&1 &
server_pid=$!
for _ in $(seq 1 50); do
  if curl -fsS --cacert .tools/device-test/cert.pem https://localhost:8443/ >/dev/null; then break; fi
  sleep 0.2
done
adb reverse tcp:8443 tcp:8443
./gradlew assembleDebug assembleDebugAndroidTest --console=plain
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -r app.line.test/androidx.test.runner.AndroidJUnitRunner \
  | tee .tools/device-test/instrumentation.log
grep -Eq '^OK \([0-9]+ tests?\)' .tools/device-test/instrumentation.log
