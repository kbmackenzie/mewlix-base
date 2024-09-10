#!/bin/sh

SCRIPT_NAME='build.sh'

rm -rf './build'
mkdir  './build'

COMPILED='./build/compiled'
FINAL='./build/final'

mkdir "$COMPILED"
mkdir "$FINAL"

HEADER='./header.js'
TERSER_CONFIG='./terser.config.json'
PROJECT_DIRECTORY=$(pwd)

# Write a log message to stdout.
log_message() {
  echo "[$SCRIPT_NAME] $1"
}

# Write an error message to stderr.
log_error() {
  echo "[$SCRIPT_NAME] $1" 1>&2
}

# Dependency Management
has_command() {
  command -v "$1" > /dev/null 2> /dev/null
}

check_dependency() {
  if has_command "$1"; then return 0; fi
  log_error "Script dependency missing: '$1'"
  return 1
}

check_dependency 'zip' || exit 1
check_dependency 'npx' || exit 1

# Compile all .ts files in ./src/
compile_ts() {
  npx tsc --outDir "$COMPILED"
}

# Minify a .js file (writes output to stdout)
minify_js() {
  npx terser "$1" --config-file "$TERSER_CONFIG"
}

# Compile a Sass stylesheet to a CSS stylesheet.
compile_sass() {
  npx sass "$1/style.sass" "$1/style.css" --style=compressed --no-source-map
}

# Compile and minify all files, and prepend comment header to them.
build() {
  compile_ts || {
    log_error "Error when compiling .ts files!"
    exit 1
  }
  for FILE in "$COMPILED"/*.js; do
    NAME=$(basename "$FILE")
    minify_js "$FILE" | cat "$HEADER" - > "$FINAL/$NAME" || {
      log_error "Error when minifying file '$FILE'!"
      exit 1
    }
  done
}

# Package template (after building):
package_template() {
  log_message "Packaging '$1' template:"
  TEMPLATE="./templates/$1"
  TARGET_FOLDER="./build/$1-build"

  if [ ! -d "$TEMPLATE" ]; then
    log_error "Invalid template: $1"
    exit 1
  fi
  cp -r "$TEMPLATE" "$TARGET_FOLDER"

  # Minify index.js source file.
  minify_js "${TEMPLATE}/index.js" > "${TARGET_FOLDER}/index.js"

  # Compile .sass stylesheets.
  if [ -f "${TARGET_FOLDER}/style.sass" ]; then
    compile_sass "$TARGET_FOLDER" || {
      log_error "Couldn't compile .sass stylesheet '${TARGET_FOLDER}/style.sass'!"
      exit 1
    }
    rm "$TARGET_FOLDER"/*.sass
  fi

  # Create 'core' folder and copy core source files.
  mkdir "$TARGET_FOLDER/core"
  cp "$FINAL/mewlix.js" "$TARGET_FOLDER/core"

  # Copy template-specific source file, if any.
  if [ -f "$FINAL/$1.js" ]; then
    cp "$FINAL/$1.js" "$TARGET_FOLDER/core"
  fi

  log_message "Zipping '$1' template:"

  cd "$TARGET_FOLDER" || {
    log_error "Couldn't cd into target folder '$TARGET_FOLDER'!"
    exit 1
  }

  zip -r "$PROJECT_DIRECTORY/build/$1" ./* || {
    log_error "Couldn't zip '$1' template!"
    exit 1
  }

  cd "$PROJECT_DIRECTORY" || {
    log_error "Couldn't cd back into project directory '$PROJECT_DIRECTORY'!"
    exit 1
  }
}

# Package all templates:
package_all() {
  package_template 'console'
  package_template 'graphic'
  package_template 'node'
}

build
package_all
