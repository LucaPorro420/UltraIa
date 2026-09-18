# Scheduler Windows — TECH-LIBRARY marketing-agent (3 posts/dia)
# ASCII puro (leccion PS 5.1 UTF-8). TaskName SIN dos puntos.
# Uso (PowerShell como Admin si pide permisos):
#   powershell -ExecutionPolicy Bypass -File TECH-LIBRARY/marketing-agent/schedule.ps1

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = "py"
$Slots = @(
  @{ Name = "TechLibrary-AutoPub-0900"; Time = "09:00" },
  @{ Name = "TechLibrary-AutoPub-1400"; Time = "14:00" },
  @{ Name = "TechLibrary-AutoPub-1900"; Time = "19:00" }
)

foreach ($slot in $Slots) {
  $action = New-ScheduledTaskAction -Execute $Python -Argument "`"$AgentDir/generate.py`""
  $trigger = New-ScheduledTaskTrigger -Daily -At $slot.Time
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries
  try {
    Register-ScheduledTask -TaskName $slot.Name -Action $action -Trigger $trigger -Settings $settings -Description "TECH-LIBRARY marketing agent" -Force | Out-Null
    Write-Host ("OK: {0} a las {1}" -f $slot.Name, $slot.Time)
  } catch {
    Write-Host ("ERROR registrando {0}: {1}" -f $slot.Name, $_.Exception.Message)
  }
}

Write-Host "Listo. Verifica con: Get-ScheduledTask -TaskName 'TechLibrary-AutoPub-*'"
Write-Host "Probar sin esperar: py `"$AgentDir/generate.py`" --dry-run"
