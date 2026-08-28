# dev-clean.ps1 — rearranque limpio del dev server de UltraIa.
# Previene la corrupcion de .next causada por multiples `next dev` compartiendo
# el mismo directorio .next (dos servers en :3000 => chunks 404 => React no hidrata).
# Uso: npm run dev:clean   (equivalente a matar puerto + rm .next + npm run dev)

$ErrorActionPreference = 'Continue'
$port = 3000
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

Write-Host "[dev-clean] Liberando puerto $port y limpiando .next ..."

# 1) Matar SOLO procesos que ESCUCHAN (LISTENING) en el puerto, no clientes conectados.
$listeners = netstat -ano | Select-String -Pattern ":${port}.*LISTENING\s+(\d+)$"
$pids = @()
foreach ($m in $listeners) { $pids += $m.Matches[0].Groups[1].Value }
$pids = $pids | Where-Object { $_ -and $_ -ne '0' } | Sort-Object -Unique
foreach ($pid in $pids) {
  Write-Host "[dev-clean] kill PID $pid"
  taskkill /T /F /PID $pid 2>$null | Out-Null
}
Start-Sleep -Seconds 2

# 2) Limpiar .next (caché de compilacion del dev server).
$nextDir = Join-Path $root '.next'
if (Test-Path $nextDir) {
  Remove-Item -Recurse -Force $nextDir
  Write-Host "[dev-clean] .next eliminado"
} else {
  Write-Host "[dev-clean] .next ausente (ok)"
}

Write-Host "[dev-clean] Listo. Iniciando 'npm run dev' ..."
Set-Location $root
& npm run dev
