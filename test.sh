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
  mewlix.Modules.addModule("main", () => void 0);
}
EOF
)

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
  cp './test/test-suite.js' "$YARNBALL_FOLDER/test-suite.js"

  if [ -f "./test/$1-test.js" ]; then
    cp "./test/$1-test.js" "$YARNBALL_FOLDER/yarnball.js"
  else
    echo "$DEFAULT_YARNBALL" > "$YARNBALL_FOLDER/yarnball.js"
  fi
}

create_tests() {
  create_test 'console'
  create_test 'graphic'
}

TARGET_TEMPLATE=''
REBUILD=false
RUN_TEST=true

LONG_OPTIONS='rebuild'
SHORT_OPTIONS='r'

OPTS=$(getopt -o "$SHORT_OPTIONS" -l "$LONG_OPTIONS" -n 'test.sh' -- "$@")
eval set -- "$OPTS"

while true; do
  case "$1" in
    -r | --rebuild)
      REBUILD=true
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
  * )
    if [ -z "$1" ]; then
      log_error 'Expected template, got none!'
    else
      log_error "Invalid template option: '$1'"
    fi
    log_error 'Specify template as argument, like this: npm run test -- console'
    exit 1 ;;
esac

if [ ! -d './build/test' ] || [ "$REBUILD" = 'true' ]; then
  log_message 'Building tests...'
  rm -rf './build/test'
  mkdir  './build/test'

  create_tests
fi

if [ "$RUN_TEST" = 'true' ]; then
  SERVER_LOG_FILE='./build/test/server.log'

  log_message "Running test for template '$TARGET_TEMPLATE'!"
  log_message "http-server log output will be saved to '$SERVER_LOG_FILE'."

  npx http-server "./build/test/$TARGET_TEMPLATE/" -o > "$SERVER_LOG_FILE" 2> "$SERVER_LOG_FILE" || {
    log_error "Couldn't run template '$1' in http server!"
    exit 1
  }
fi
