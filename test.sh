#!/bin/bash

# Write a log message to stdout.
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

# ------------------------------
# Constants:
# ------------------------------

# Templates with test suites:
TEMPLATES='console graphic'

# Yarn ball for testing:
TEST_YARNBALL=$(cat << EOF
export default function(mewlix) {
  mewlix.modules.add("main", () => {
    /* Make 'mewlix' object globally available (for testing). */
    globalThis.mewlix = mewlix;
  });
}
EOF
)

# ------------------------------
# Config options:
# ------------------------------
# Should tests be run?
RUN_TESTS=true

# Should tests be re-built?
REBUILD=false

# How long to wait for server before running jest?
WAIT_DURATION=3

# Note: Additional configuration should be placed in test-config.json.
# Note: Server ports are defined in test-config.json.

# ------------------------------
# Parse command-line arguments:
# ------------------------------
LONG_OPTIONS='rebuild,wait:,dont-run'
SHORT_OPTIONS='rw:d'

OPTS=$(getopt -o "$SHORT_OPTIONS" -l "$LONG_OPTIONS" -n 'test.sh' -- "$@")
eval set -- "$OPTS"

while true; do
  case "$1" in
    -r | --rebuild)
      REBUILD=true
      shift ;;
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
  echo "$TEST_YARNBALL" > "$YARNBALL_FOLDER/yarnball.js"
}

create_tests() {
  for TEMPLATE in $TEMPLATES; do
    create_test "$TEMPLATE"
  done
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
get_port() {
  TEMPLATE="$1"
  cat './test-config.json' | npx json "ports.${TEMPLATE}"
}

run_server() {
  TEMPLATE="$1"
  PORT=$(get_port "$TEMPLATE")
  LOG_FILE="./build/test/server-${TEMPLATE}.log"

  log_message "Running server for testing '$TEMPLATE' template..."
  log_message "http-server log output will be saved to '$LOG_FILE'."

  ( npx http-server "./build/test/$TEMPLATE/" --port "$PORT" >"$LOG_FILE" 2>&1 ) &
}

run_tests() {
  SERVER_PIDS=()

  for TEMPLATE in $1; do
    # Verify test exists
    if [ ! -d "./build/test/$TEMPLATE" ]; then
      log_error "Invalid template '$TEMPLATE': Test directory doesn't exist!"
      continue
    fi
    # Run server + store PID
    run_server "$TEMPLATE"
    SERVER_PID=$!

    SERVER_PIDS+=("$SERVER_PID")
  done

  # Run jest
  sleep "$WAIT_DURATION"
  npx jest

  # Kill servers
  for SERVER_PID in "${SERVER_PIDS[@]}"; do
    kill "$SERVER_PID" || log_error "Couldn't kill server with PID '$SERVER_PID'!"
  done
}

if [ "$RUN_TESTS" = 'true' ]; then
  run_tests "$TEMPLATES"
fi
