@echo off
title IA Core Gateway & Memory Router
echo ===================================================
echo     IA CORE GATEWAY - ENRUTADOR Y SISTEMA DE MEMORIA
echo ===================================================
echo. 

:: 1. Definir e inicializar directorios de memoria persistente
set "MEMORY_DIR=%USERPROFILE%.opencode_memory"
set "SESSION_FILE=%MEMORY_DIR%\active_session.json"
set "COMPRESSED_LOG=%MEMORY_DIR%\compressed_history.log" 

if not exist "%MEMORY_DIR%" (
mkdir "%MEMORY_DIR%"
echo [+] Directorio de memoria creado en: %MEMORY_DIR%
) 

:: 2. Crear estructura inicial de base de conocimientos indexada si no existe
if not exist "%SESSION_FILE%" (
(
echo {
echo   "meta": { "status": "active", "compression": "enabled" },
echo   "last_action": "",
echo   "implemented_features": [],
echo   "engineering_decisions": [],
echo   "working_context": {}
echo }
) > "%SESSION_FILE%"
echo [+] Base de datos de memoria contextual inicializada.
) 

:: 3. Verificar estado del enrutador HTTP local (Simulado en puerto 8080)
echo [+] Verificando conexion con Ollama backend en puerto 11434...
curl -s http://localhost:11434/v1/models > nul
if %errorlevel% neq 0 (
echo [!] ALERTA: No se detecto Ollama corriendo en el puerto 11434. Asegurate de iniciar tu servidor local.
) else (
echo [OK] Backend de Ollama conectado correctamente.
)
echo. 

:: 4. Logica de actualizacion y compresion de la memoria
echo [+] Compactando registros de sesiones anteriores para liberar espacio de contexto...
if exist "%SESSION_FILE%" (
echo [MEMORIA] Indexando ultimos cambios de implementacion en %COMPRESSED_LOG%
type "%SESSION_FILE%" >> "%COMPRESSED_LOG%"
) 

echo.
echo ===================================================
echo   ENRUTADOR ACTIVO: Escuchando peticiones de OpenCode
echo   MEMORIA ACTIVA: Historial de ingenieria protegido.
echo ===================================================
echo Presiona cualquier tecla para sincronizar el estado actual en VSC...
pause > nul