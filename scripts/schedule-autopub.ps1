# =============================================================================
# schedule-autopub.ps1 (iter-90) - Programa el ciclo AutoPub Autonomo en Windows.
#
# Registra TRES tareas diarias en el Programador de Tareas (09:00 / 14:00 / 19:00
# hora local) que ejecutan "vite-node Task/run-autopub.ts --publish-due --max 3"
# sobre ESTE repositorio, sin abrir ventana y logueando a logs\autopub.log.
#
# Uso (PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\schedule-autopub.ps1              # registrar x3
#   powershell -ExecutionPolicy Bypass -File scripts\schedule-autopub.ps1 -Times '07:30','21:00'
#   powershell -ExecutionPolicy Bypass -File scripts\schedule-autopub.ps1 -Remove      # desregistrar
#   powershell -ExecutionPolicy Bypass -File scripts\schedule-autopub.ps1 -RunNow      # registrar + disparar ya
#
# Sin admin: las tareas se registran para el usuario actual. Idempotente (-Force sobrescribe).
# NOTA: este archivo es ASCII puro a proposito (PS 5.1 corrompe UTF-8 sin BOM).
# =============================================================================
param(
  [string[]]$Times = @('09:00', '14:00', '19:00'),
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$Remove,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'
$prefix = 'UltraIA AutoPub'
$viteNode = Join-Path $RepoRoot 'node_modules\.bin\vite-node.cmd'
$logDir = Join-Path $RepoRoot 'logs'
$logFile = Join-Path $logDir 'autopub.log'

if ($Remove) {
  foreach ($t in $Times) {
    $tag = $t -replace ':', ''
    $name = "$prefix $tag"
    $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($existing) {
      Unregister-ScheduledTask -TaskName $name -Confirm:$false
      Write-Host "[remove] $name eliminada"
    } else {
      Write-Host "[remove] $name no existia"
    }
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $viteNode)) {
  Write-Error "No se encontro vite-node.cmd en $viteNode - corre 'npm install' en $RepoRoot primero."
  exit 1
}
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Cadena para cmd.exe: cd al repo, correr el ciclo y adjuntar salida al log.
$cmdArgs = '/c cd /d "' + $RepoRoot + '" && node_modules\.bin\vite-node.cmd Task\run-autopub.ts --publish-due >> "' + $logFile + '" 2>&1'

$registradas = @()
foreach ($t in $Times) {
  # Los DOS PUNTOS no son validos en TaskName (CIM los trata como separador de
  # carpeta) -> el tag usa formato 0900/1400/1900.
  $tag = $t -replace ':', ''
  $name = "$prefix $tag"
  $action = New-ScheduledTaskAction -Execute "$env:ComSpec" -Argument $cmdArgs -WorkingDirectory $RepoRoot
  $trigger = New-ScheduledTaskTrigger -Daily -At $t
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'UltraIA fabrica de contenido autonomo (ciclo F1-F4 + publicacion de vencidos)' -Force | Out-Null
  $registradas += $name
  Write-Host "[ok] $name registrada (diaria $t)"
}

if ($RunNow) {
  foreach ($name in $registradas) { Start-ScheduledTask -TaskName $name }
  Write-Host '[run] ciclos disparados; revisa logs\autopub.log'
}

Write-Host ''
Write-Host 'Verificar:  Get-ScheduledTask -TaskName "UltraIA AutoPub*"'
Write-Host "Log:        $logFile"
Write-Host "Quitar:     scripts\schedule-autopub.ps1 -Remove"
