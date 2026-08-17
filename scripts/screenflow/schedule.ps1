# schedule.ps1 — crea una tarea programada de Windows (schtasks) para un run
# de ScreenFlow. Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\screenflow\schedule.ps1 `
#     -ScriptPath Task\run_screenflow.ts -RunId 20260817120000-demo -Time "09:30"
param(
  [Parameter(Mandatory = $true)][string]$ScriptPath,
  [Parameter(Mandatory = $true)][string]$RunId,
  [Parameter(Mandatory = $true)][string]$Time
)

$taskName = "UltraIa\ScreenFlow-$RunId"
$command = "node `"$ScriptPath`" --run-id $RunId"
Write-Host "Creando tarea $taskName a las $Time ..."

schtasks /Create /TN $taskName /TR $command /SC DAILY /ST $Time /F | Out-Host
if ($LASTEXITCODE -eq 0) {
  Write-Host "OK — tarea creada. Ver: schtasks /Query /TN `"$taskName`""
} else {
  Write-Host "ERROR creando tarea (exit $LASTEXITCODE)" -ForegroundColor Red
  exit 1
}
