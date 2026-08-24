# =============================================================================
# iniciar-local.ps1 (iter-92) - Arranque local de UltraIa adaptado a la RAM.
#
# Detecta la RAM total del equipo y elige perfil automaticamente:
#   - minimo  (<6 GB): python start.py --lite [--ram-mb 384|512]
#       heap de Node limitado y SOLO la web (sin webhooks/gen-engine).
#   - estandar (>=6 GB): python start.py (web + webhooks + gen-engine)
#
# Ejemplos:
#   powershell -ExecutionPolicy Bypass -File scripts\iniciar-local.ps1
#   powershell ... -File scripts\iniciar-local.ps1 -Perfil minimo
#   powershell ... -File scripts\iniciar-local.ps1 -Perfil minimo -RamMb 384
#   powershell ... -File scripts\iniciar-local.ps1 -Lan          # abrir a la red (movil)
#   powershell ... -File scripts\iniciar-local.ps1 -SinNavegador
#   powershell ... -File scripts\iniciar-local.ps1 -SoloSetup    # instalar una vez
#
# Guia completa: docs/INICIO-LOCAL-Y-NUBE.md
# NOTA: archivo ASCII puro a proposito (PS 5.1 corrompe UTF-8 sin BOM).
# =============================================================================
param(
  [ValidateSet('auto', 'minimo', 'estandar')]
  [string]$Perfil = 'auto',
  [int]$RamMb = 0,
  [switch]$Lan,
  [switch]$SinNavegador,
  [switch]$SoloSetup,
  [string]$PythonExe = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# --- Resolver interprete Python (python -> py) -------------------------------
$python = $PythonExe
if (-not $python) {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd) { $python = 'python' } else {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) { $python = 'py' } else {
      Write-Error 'No se encontro Python (python/py en PATH). Instala Python 3.10+.'
      exit 1
    }
  }
}

# --- Detectar RAM total ------------------------------------------------------
$bytesTotal = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
$ramGB = [Math]::Round($bytesTotal / 1GB, 1)

# --- Elegir perfil -----------------------------------------------------------
if ($Perfil -eq 'auto') {
  if ($ramGB -lt 6) { $Perfil = 'minimo' } else { $Perfil = 'estandar' }
}

$args_ = @()
$heapDesc = '(sin cap)'
if ($Perfil -eq 'minimo') {
  $args_ += '--lite'
  if ($RamMb -gt 0) {
    $args_ += "--ram-mb=$RamMb"
    $heapDesc = "$RamMb MB"
  } elseif ($ramGB -le 4.5) {
    $args_ += '--ram-mb=384'
    $heapDesc = '384 MB'
  } else {
    $heapDesc = '512 MB (default lite)'
  }
}
if ($SoloSetup) { $args_ += '--install' }
if ($Lan) { $args_ += '--host'; $args_ += '0.0.0.0' }
if ($SinNavegador) { $args_ += '--no-open' }

Write-Host ''
Write-Host "UltraIa local - RAM detectada: $ramGB GB | perfil: $Perfil | heap Node: $heapDesc"
if ($Perfil -eq 'minimo') {
  Write-Host 'Perfil MINIMO: solo la web arranca. Fabrica de contenido por schtasks (no necesita esta ventana).'
}
Write-Host "Comando: $python start.py $($args_ -join ' ')"
Write-Host ''

& $python start.py @args_
exit $LASTEXITCODE
