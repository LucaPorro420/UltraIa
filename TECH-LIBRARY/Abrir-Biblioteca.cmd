@echo off
rem UltraIa Biblio - abre TECH-LIBRARY/index.html en ventana app (offline, sin instalar nada).
rem Uso: doble-click. No necesita Node, ni servidor, ni internet.
set "PAGE=%~dp0index.html"
if not exist "%PAGE%" (
  echo No se encuentra index.html junto a este archivo.
  pause
  exit /b 1
)
set "URL=file:///%PAGE:\=/%"
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --user-data-dir="%TEMP%\ultraia-biblio"
  exit /b 0
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --user-data-dir="%TEMP%\ultraia-biblio"
  exit /b 0
)
start "" "%PAGE%"
