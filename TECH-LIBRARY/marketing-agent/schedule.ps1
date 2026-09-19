# Scheduler Windows — TECH-LIBRARY fabrica local (3 packs/dia + doctor semanal)
# ASCII puro (leccion PS 5.1 UTF-8). TaskName SIN dos puntos. Sin telefono.
# Uso (PowerShell como Admin si pide permisos):
#   powershell -ExecutionPolicy Bypass -File TECH-LIBRARY/marketing-agent/schedule.ps1

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = "py"
$Slots = @(
  @{ Name = "TechLibrary-Factory-0900"; Time = "09:00"; Args = "`"$AgentDir/factory.py`" --todo" },
  @{ Name = "TechLibrary-Factory-1400"; Time = "14:00"; Args = "`"$AgentDir/factory.py`" --todo" },
  @{ Name = "TechLibrary-Factory-1900"; Time = "19:00"; Args = "`"$AgentDir/factory.py`" --todo" }
)

foreach ($slot in $Slots) {
  $action = New-ScheduledTaskAction -Execute $Python -Argument $slot.Args
  $trigger = New-ScheduledTaskTrigger -Daily -At $slot.Time
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries
  try {
    Register-ScheduledTask -TaskName $slot.Name -Action $action -Trigger $trigger -Settings $settings -Description "TECH-LIBRARY fabrica local (sin telefono)" -Force | Out-Null
    Write-Host ("OK: {0} a las {1}" -f $slot.Name, $slot.Time)
  } catch {
    Write-Host ("ERROR registrando {0}: {1}" -f $slot.Name, $_.Exception.Message)
  }
}

# Doctor semanal (lunes 08:00): re-inventaria el PC por si instalas/cambias algo.
try {
  $dAction = New-ScheduledTaskAction -Execute $Python -Argument "`"$AgentDir/doctor.py`""
  $dTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "08:00"
  $dSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries
  Register-ScheduledTask -TaskName "TechLibrary-Doctor-Weekly" -Action $dAction -Trigger $dTrigger -Settings $dSettings -Description "TECH-LIBRARY doctor semanal" -Force | Out-Null
  Write-Host "OK: TechLibrary-Doctor-Weekly los lunes 08:00"
} catch {
  Write-Host ("ERROR registrando doctor: {0}" -f $_.Exception.Message)
}

Write-Host "Listo. Verifica con: Get-ScheduledTask -TaskName 'TechLibrary-*'"
Write-Host "Probar sin esperar: py `"$AgentDir/factory.py`" --demo"
