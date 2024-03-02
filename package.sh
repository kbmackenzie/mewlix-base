#!/bin/sh

# The ever-feared 'rm -rf'.
rm -rf './build'
mkdir  './build'

# Template list:
TEMPLATES='console graphic library'

# Copy projects to directories.
for TEMPLATE in $TEMPLATES; do
    echo "Copying '$TEMPLATE' template..."
    BUILD_FOLDER="./build/$TEMPLATE-build"

    cp -r "./$TEMPLATE" "$BUILD_FOLDER"
    cp -n './mewlix.js' "$BUILD_FOLDER/core/mewlix.js"
    cp -n './run-mewlix.js' "$BUILD_FOLDER/core/run-mewlix.js"

    echo "Zipping '$TEMPLATE':"
    cd "$BUILD_FOLDER"
    zip -r "../$TEMPLATE" .
    cd ..
    cd ..
done
