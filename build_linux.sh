#!/bin/sh
chmod +x "./ruffle/ruffle"
rm ./plugins/*.dll
rm -rf ./plugins/PepperFlashPlayer.plugin
rm ./ruffle/*.exe
rm -rf ./ruffle/Ruffle.app
npm run pack
mkdir ./dist/linux-unpacked
cp ruffle-platforms/ruffle ruffle/ruffle 
cp ./build/LinuxAppDirFiles/* ./dist/linux-unpacked/
cd dist
../build/appimagetool-x86_64.AppImage linux-unpacked
wait
cd ..
git checkout -- plugins*
git checkout -- ruffle*
