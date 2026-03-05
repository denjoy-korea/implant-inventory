param(
  [string]$TaskPrefix = "Dentweb-Implant-Upload",
  [string]$PythonExe = "python",
  [string]$ProjectDir = (Get-Location).Path
)

$scriptPath = Join-Path $ProjectDir "run_automation.py"
$configPath = Join-Path $ProjectDir "config.yaml"

if (-not (Test-Path $scriptPath)) {
  throw "run_automation.py not found: $scriptPath"
}
if (-not (Test-Path $configPath)) {
  throw "config.yaml not found: $configPath"
}

$taskDaily = "$TaskPrefix-2200"
$taskStartup = "$TaskPrefix-Startup"

$argDaily = "`"$scriptPath`" --config `"$configPath`" --reason schedule"
$argStartup = "`"$scriptPath`" --config `"$configPath`" --reason startup"

$actionDaily = New-ScheduledTaskAction -Execute $PythonExe -Argument $argDaily -WorkingDirectory $ProjectDir
$actionStartup = New-ScheduledTaskAction -Execute $PythonExe -Argument $argStartup -WorkingDirectory $ProjectDir

$triggerDaily = New-ScheduledTaskTrigger -Daily -At 10:00PM
$triggerStartup = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $taskDaily `
  -Action $actionDaily `
  -Trigger $triggerDaily `
  -Settings $settings `
  -Description "Dentweb implant stats export/upload at 22:00 daily" `
  -Force | Out-Null

Register-ScheduledTask `
  -TaskName $taskStartup `
  -Action $actionStartup `
  -Trigger $triggerStartup `
  -Settings $settings `
  -Description "Dentweb implant stats startup safety run (only after guard hour)" `
  -Force | Out-Null

Write-Host "Scheduled tasks registered:"
Write-Host " - $taskDaily (daily 22:00)"
Write-Host " - $taskStartup (at logon)"
