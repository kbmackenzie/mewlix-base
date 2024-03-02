#!/bin/sh

# The ever-feared 'rm -rf'.
rm -rf './output'
mkdir  './output'

# Template list:
TEMPLATES='console graphic library'

# Copy projects to directories.
for TEMPLATE in $TEMPLATES; do
    cp -r "./$TEMPLATE" "./output/$TEMPLATE"
    cp -n './mewlix.js' "./output/$TEMPLATE/core/mewlix.js"
    cp -n './run-mewlix.js' "./output/$TEMPLATE/core/run-mewlix.js"
done
