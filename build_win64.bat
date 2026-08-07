
del /f dist\ArtixLauncher_win_x64.exe
del /f dist\ArtixLauncher_win_x64-portable.exe
del /f plugins\pepflashplayer32.dll
del /f plugins\libpepflashplayer.so
del /f ruffle\ruffle
rmdir /Q /s ruffle\Ruffle.app
del /f ruffle\ruffle_win32.exe
ren "ruffle\ruffle_x64.exe" ruffle.exe
rmdir /Q /S plugins\PepperFlashPlayer.plugin

call npm run dist
ren "dist\Artix Game Launcher Setup 2.2.0.exe" ArtixLauncher_win_x64.exe
ren "dist\Artix Game Launcher 2.2.0.exe" ArtixLauncher_win_x64-portable.exe

del /f ruffle\ruffle.exe
git checkout -- plugins\*
git checkout -- ruffle\*
Echo "Command Finished Successfully!""
