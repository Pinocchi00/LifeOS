#!/usr/bin/env bash
set -euo pipefail
log="$1"
# AndroidJUnitRunner may print OK after an Activity teardown crash. Require a
# completed test and reject every negative per-test status, regardless of OK.
grep -Eq 'OK \([1-9][0-9]* tests?\)' "$log"
grep -Eq '^INSTRUMENTATION_STATUS_CODE: 0[[:space:]]*$' "$log"
if grep -Eq 'INSTRUMENTATION_STATUS_CODE: -[0-9]+|Process crashed|FAILURES!!!|INSTRUMENTATION_FAILED|INSTRUMENTATION_STATUS: stack=' "$log"; then
  echo "Android instrumentation reported a failure or crash, even if its summary says OK." >&2
  exit 1
fi
