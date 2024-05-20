#!/bin/bash

BUILD_FOLDER='./build/'

# Write an error message to stderr.
log_message() {
  echo "[test.sh] $1"
}

# Write an error message to stderr.
log_error() {
  echo "[test.sh] $1" 1>&2
}

if [ ! -d "$BUILD_FOLDER" ]; then
  log_message 'Building templates before testing...'
  ./build.sh || {
    log_error 'Error building templates!'
    exit 1
  }
fi

rm -rf './build/test'
mkdir  './build/test'

DEFAULT_YARNBALL=$(cat << EOF
export default function(mewlix) {
  mewlix.Modules.addModule("main", () => void 0);
}
EOF
)

create_test() {
  log_message "Creating test for template '$1'..."
  TARGET_FOLDER="./build/test/$1"

  cp -r "$BUILD_FOLDER/$1-build" "$TARGET_FOLDER" || {
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

create_tests

# temporary line.
npx http-server './build/test/console/' -o
