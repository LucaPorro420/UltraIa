# UltraIa — run everything
# Arranca los 3 servicios: web app (Next.js), webhook server (FastAPI) y valida pipeline.
# Uso:  ./run-all.ps1        (todo)
#       ./run-all.ps1 -Web   (solo web)
#       ./run-all.ps1 -Hooks (solo webhooks)
param(
  [switch]$Web,
  [switch]$Hooks,
  [switch]$Validate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pipe = Join-Path $root "ULTRAIA\integracionesImplementacion"

function Start-Web {
  Write-Host "[ultraia] Next.js web app -> http://localhost:3000" -ForegroundColor Green
  Push-Location $root
  try { npm run dev }
  finally { Pop-Location }
}

function Start-Hooks {
  Write-Host "[ultraia] Webhook server (Runway/Fal) -> http://localhost:8000" -ForegroundColor Green
  Push-Location $pipe
  try { python webhook_server.py }
  finally { Pop-Location }
}

function Test-Pipeline {
  Write-Host "[ultraia] Validando pipeline ar-SA..." -ForegroundColor Green
  Push-Location $pipe
  try { python main.py --validate }
  finally { Pop-Location }
}

if ($Validate) { Test-Pipeline; exit 0 }

if ($Web -or -not ($Hooks)) {
  if ($Hooks) {
    Start-Job -ScriptBlock { param($pipe) Push-Location $pipe; python webhook_server.py; Pop-Location } -ArgumentList $pipe | Out-Null
    Write-Host "[ultraia] webhooks en background (puerto 8000)" -ForegroundColor Yellow
  }
  Start-Web
} elseif ($Hooks) {
  Start-Hooks
} else {
  Write-Host "[ultraia] Uso: run-all.ps1 [-Web] [-Hooks] [-Validate]" -ForegroundColor Yellow
}
