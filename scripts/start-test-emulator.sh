#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$PWD/.android-sdk}"
export ANDROID_AVD_HOME="$PWD/.tools/avd"
mkdir -p "$ANDROID_AVD_HOME"
"$ANDROID_HOME/cmdline-tools/19.0/bin/sdkmanager" 'emulator' 'system-images;android-30;default;x86_64'
if [[ ! -f "$ANDROID_AVD_HOME/line-light.ini" ]]; then
  echo no | "$ANDROID_HOME/cmdline-tools/19.0/bin/avdmanager" create avd -n line-light \
    -k 'system-images;android-30;default;x86_64' --device pixel_3a
fi
accel=auto
if [[ ! -r /dev/kvm ]]; then accel=off; fi
exec "$ANDROID_HOME/emulator/emulator" -avd line-light -no-window -no-audio -no-boot-anim \
  -no-snapshot -accel "$accel" -gpu swiftshader_indirect -cores 1 -memory 3072
