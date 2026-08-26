# -----------------------------------------------------------------------------
# netwatch-schedule.ps1 - programa el watchdog WiFi/red con el Programador de
# tareas (corre mientras el dispositivo este encendido).
# -----------------------------------------------------------------------------
# Uso:
#   .\scripts\netwatch-schedule.ps1                    # cada 5 minutos
#   .\scripts\netwatch-schedule.ps1 -EveryNMinutes 10  # cada 10 minutos
#   .\scripts\netwatch-schedule.ps1 -Remove            # desprogramar
# Requiere: node_modules instalado (vite-node). No necesita API keys.
# -----------------------------------------------------------------------------

param(
    [int]$EveryNMinutes = 5,
    [string]$TaskName = 'UltraIa-NetWatch',
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

if ($Remove) {
    schtasks /Delete /TN $TaskName /F
    Write-Host "[netwatch] tarea '$TaskName' eliminada."
    exit 0
}

$ViteNode = Join-Path $Root 'node_modules\.bin\vite-node.cmd'
if (-not (Test-Path $ViteNode)) {
    Write-Error "[netwatch] falta $ViteNode - ejecuta 'npm install' primero."
}

$Action = "cmd /c cd /d `"$Root`" && `"$ViteNode`" Task/netwatch-run.ts --once"

schtasks /Create /F /TN $TaskName /SC MINUTE /MO ([Math]::Max(5, $EveryNMinutes)) /TR $Action
Write-Host "[netwatch] tarea programada '$TaskName' (cada $EveryNMinutes min; auditoria en .ultraia\netwatch\audit.ndjson)."
Write-Host "[netwatch] probar manualmente: `"$ViteNode`" Task/netwatch-run.ts --once"
