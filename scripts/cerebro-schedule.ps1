# -----------------------------------------------------------------------------
# cerebro-schedule.ps1 - programa el Cerebro con el Programador de tareas
# -----------------------------------------------------------------------------
# Uso:
#   .\scripts\cerebro-schedule.ps1                       # intervalo por defecto (120 min)
#   .\scripts\cerebro-schedule.ps1 -Mode daily -At 09:00 # una vez al dia a las 09:00
#   .\scripts\cerebro-schedule.ps1 -Remove               # desprogramar
# Requiere: node_modules instalado (vite-node) y ffmpeg en PATH para MP4.
# -----------------------------------------------------------------------------

param(
    [ValidateSet('interval', 'daily')]
    [string]$Mode = 'interval',
    [int]$EveryNMinutes = 120,
    [string]$At = '09:00',
    [string]$TaskName = 'UltraIa-Cerebro',
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

if ($Remove) {
    schtasks /Delete /TN $TaskName /F
    Write-Host "[cerebro] tarea '$TaskName' eliminada."
    exit 0
}

$ViteNode = Join-Path $Root 'node_modules\.bin\vite-node.cmd'
if (-not (Test-Path $ViteNode)) {
    Write-Error "[cerebro] falta $ViteNode - ejecuta 'npm install' primero."
}

$Action = "cmd /c cd /d `"$Root`" && `"$ViteNode`" Task/cerebro-cycle.ts --run"

if ($Mode -eq 'daily') {
    schtasks /Create /F /TN $TaskName /SC DAILY /ST ($At.Replace(':', '')) /TR $Action
} else {
    schtasks /Create /F /TN $TaskName /SC MINUTE /MO ([Math]::Max(5, $EveryNMinutes)) /TR $Action
}
Write-Host "[cerebro] tarea programada '$TaskName' ($Mode $(if ($Mode -eq 'daily') { $At } else { "$EveryNMinutes min" }))."
Write-Host "[cerebro] probar manualmente: `"$ViteNode`" Task/cerebro-cycle.ts --run"
