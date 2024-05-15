#!/bin/sh

rm -rf './build'
mkdir  './build'

COMPILED='./build/compiled'
FINAL='./build/final'

mkdir "$COMPILED"
mkdir "$FINAL"

HEADER='./header.js'
TERSER_CONFIG='./terser.config.json'
PROJECT_DIRECTORY=$(pwd)

# Write an error message to stderr.
print_error() {
  echo "$1" 1>&2
}

# Compile all .ts files in ./src/
compile() {
  npx tsc --outDir "$COMPILED"
}

# Minify a .js file (writes output to stdout)
minify() {
  npx terser "$1" --config-file "$TERSER_CONFIG"
}

# Compile and minify all files, and prepend comment header to them.
build() {
  compile || {
    print_error "Error when compiling .ts files!"
    exit 1
  }
  for FILE in "$COMPILED"/*.js; do
    NAME=$(basename "$FILE")
    minify "$FILE" | cat "$HEADER" - > "$FINAL/$NAME" || {
      print_error "Error when minifying file '$FILE'!"
      exit 1
    }
  done
}

# Package template (after building):
package_template() {
  echo "Packaging '$1' template:"
  TEMPLATE="./templates/$1"
  TARGET_FOLDER="./build/$1-build"

  if [ ! -d "$TEMPLATE" ]; then
    print_error "Invalid template: $1"
    exit 1
  fi
  cp -r "$TEMPLATE" "$TARGET_FOLDER"

  mkdir "$TARGET_FOLDER/core"
  cp "$FINAL/mewlix.js" "$TARGET_FOLDER/core"

  if [ -f "$FINAL/$1.js" ]; then
    cp "$FINAL/$1.js"   "$TARGET_FOLDER/core"
  fi

  echo "Zipping '$1' template:"

  cd "$TARGET_FOLDER" || {
    print_error "Couldn't cd into target folder '$TARGET_FOLDER'!"
    exit 1
  }

  zip -r "$PROJECT_DIRECTORY/build/$1" ./* || {
    print_error "Couldn't zip '$1' template!"
    exit 1
  }

  cd "$PROJECT_DIRECTORY" || {
    print_error "Couldn't cd back into project directory '$PROJECT_DIRECTORY'!"
    exit 1
  }
}

# Package all templates:
package_all() {
  package_template 'console'
  package_template 'graphic'
  package_template 'library'
}

build
package_all
