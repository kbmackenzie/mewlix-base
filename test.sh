#!/bin/bash

# Write an error message to stderr.
log_message() {
  echo "[test.sh] $1"
}

# Write an error message to stderr.
log_error() {
  echo "[test.sh] $1" 1>&2
}

if [ ! -d './build' ]; then
  log_message 'Building templates before testing...'
  ./build.sh || {
    log_error 'Error building templates!'
    exit 1
  }
fi

DEFAULT_YARNBALL=$(cat << EOF
export default function(mewlix) {
  mewlix.modules.addModule("main", () => {
    /* Make 'mewlix' object globally available (for testing). */
    globalThis.mewlix = mewlix;
  });
}
EOF
)

# ------------------------------
# CONFIG OPTIONS
# ------------------------------
# Should tests be run?
RUN_TESTS=true

# Which templates to target?
TARGET_TEMPLATE='all'

# Should tests be re-built?
REBUILD=false

# What port to use with http-server?
SERVER_PORT=8080

# How long to wait for server before running jest?
WAIT_DURATION=3

# ------------------------------
# Parse command-line arguments:
# ------------------------------
LONG_OPTIONS='rebuild,port:,wait:,dont-run'
SHORT_OPTIONS='rp:w:d'

OPTS=$(getopt -o "$SHORT_OPTIONS" -l "$LONG_OPTIONS" -n 'test.sh' -- "$@")
eval set -- "$OPTS"

while true; do
  case "$1" in
    -r | --rebuild)
      REBUILD=true
      shift ;;
    -p | --port)
      PORT="$2"
      shift 2 ;;
    -w | --wait)
      WAIT_DURATION="$2"
      shift 2 ;;
    -d | --dont-run)
      RUN_TESTS=false
      shift ;;
    --)
      shift
      break ;;
    * )
      break ;;
  esac
done

case "$1" in
  console)
    TARGET_TEMPLATE='console' ;;
  graphic)
    TARGET_TEMPLATE='graphic' ;;
  * ) ;;
esac

# ------------------------------
# Build tests:
# ------------------------------
create_test() {
  log_message "Creating test for template '$1'..."
  TARGET_FOLDER="./build/test/$1"

  cp -r "./build/$1-build" "$TARGET_FOLDER" || {
    log_error "Couldn't copy template '$1'!"
    exit 1
  }

  echo '{}' > "$TARGET_FOLDER/core/meta.json"

  YARNBALL_FOLDER="$TARGET_FOLDER/yarnball"
  mkdir "$YARNBALL_FOLDER"
  echo "$DEFAULT_YARNBALL" > "$YARNBALL_FOLDER/yarnball.js"
}

create_tests() {
  create_test 'console'
  create_test 'graphic'
}

if [ ! -d './build/test' ] || [ "$REBUILD" = 'true' ]; then
  log_message 'Building tests...'
  rm -rf './build/test'
  mkdir  './build/test'

  create_tests
fi

# ------------------------------
# Run all tests:
# ------------------------------
run_server() {
  TEMPLATE="$1"
  PORT="$SERVER_PORT"
  LOG_FILE="./build/test/server-${TEMPLATE}.log"

  log_message "Running server for testing template '$TEMPLATE'..."
  log_message "http-server log output will be saved to '$LOG_FILE'."

  ( npx http-server "./build/test/$TEMPLATE/" --port "$PORT" >"$LOG_FILE" 2>&1 ) &
}

run_test() {
  TEMPLATE="$1"

  # Run server + store PID
  run_server "$TEMPLATE"
  SERVER_PID=$!

  # Run jest
  sleep "$WAIT_DURATION"
  npx jest "${TEMPLATE}.test.js"

  # Kill server
  kill "$SERVER_PID"
}

if [ "$RUN_TESTS" = 'true' ]; then
  TEMPLATES='console graphic'

  if [ "$TARGET_TEMPLATE" != 'all' ]; then
    TEMPLATES="$TARGET_TEMPLATE"
  fi

  for TEMPLATE in $TEMPLATES; do
    if [ ! -d "./build/test/$TEMPLATE" ]; then
      log_error "Invalid template '$TEMPLATE': Test directory doesn't exist!"
      continue
    fi
    run_test "$TEMPLATE"
  done
fi
