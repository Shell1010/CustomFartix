copy ruffle-platforms\ruffle_win32.exe ruffle\ruffle.exe

del /f dist\ArtixLauncher_win_x86.exe
del /f dist\ArtixLauncher_win_x86-portable.exe
del /f plugins\pepflashplayer.dll
del /f plugins\libpepflashplayer.so
rmdir /Q /S plugins\PepperFlashPlayer.plugin
call npm run dist-32bit
ren "dist\Artix Game Launcher Setup 2.2.0.exe" ArtixLauncher_win_x86.exe
ren "dist\Artix Game Launcher 2.2.0.exe" ArtixLauncher_win_x86-portable.exe

git checkout -- plugins\*

del ruffle\ruffle.exe
Echo "Command Finished Successfully!"