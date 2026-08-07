#!/bin/sh
rm ./plugins/*.dll
rm ./plugins/libpepflashplayer.so
npm run dist
mv 'dist/Artix Game Launcher-2.2.0.dmg' 'dist/ArtixGameLauncher.dmg'
wait
git checkout -- plugins*