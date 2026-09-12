@echo off
setlocal

set "VSDEVCMD=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" (
  echo Visual Studio Build Tools was not found.
  exit /b 1
)

call "%VSDEVCMD%" -arch=x64
if errorlevel 1 exit /b %errorlevel%

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "CARGO_TARGET_DIR=%LOCALAPPDATA%\SkyTween\target"
npm run tauri dev
