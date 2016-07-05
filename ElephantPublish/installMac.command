#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ZXP_PATH="$DIR/ElephantPublish_1.04_MAC.zxp"

EXMAN_PATH="/Applications/ZXPInstaller.app/Contents/Resources/app/bin/OSX/Contents/MacOS/ExManCmd"

echo ""
echo ElephantPublish Installer
echo ==========================

# Install ZXP plugin
sudo $EXMAN_PATH --install $ZXP_PATH

# List installed plugins
$EXMAN_PATH --list all
