#!/bin/sh

print_error() {
  echo "$1" 1>&2
}

# The ever-feared 'rm -rf'.
rm -rf './build'
mkdir  './build'

# Template list:
TEMPLATES='console graphic library'

# Package templates:
for TEMPLATE in $TEMPLATES; do
    BUILD_FOLDER="./build/$TEMPLATE-build"

    echo "Copying '$TEMPLATE' template..."

    cp -r "./$TEMPLATE" "$BUILD_FOLDER"
    cp -n './mewlix.js' "$BUILD_FOLDER/core/mewlix.js"
    cp -n './run-mewlix.js' "$BUILD_FOLDER/core/run-mewlix.js"

    if [ "$TEMPLATE" != 'library' ]; then
        cp -n './favicon.svg' "$BUILD_FOLDER/favicon.svg"
    fi

    echo "Zipping '$TEMPLATE':"

    cd "$BUILD_FOLDER" || {
      print_error "Couldn't cd into folder '$BUILD_FOLDER'!"
      exit 1
    }

    zip -r "../$TEMPLATE" . || {
      print_error "Couldn't zip '$TEMPLATE' template!"
      exit 1
    }

    cd .. && cd ..
done
