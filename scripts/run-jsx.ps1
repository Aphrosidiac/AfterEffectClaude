<#
.SYNOPSIS
  Run an ExtendScript (.jsx) file in After Effects 2026.

.DESCRIPTION
  Uses AfterFX.com (the console-attached launcher) so the shell waits for AE.

  WARNING: if After Effects is already running, the script executes INSIDE that live
  instance, against whatever project is open. Ask Fakhrul before running anything that
  mutates the project. -CheckOnly reports whether AE is running and exits.

.EXAMPLE
  .\run-jsx.ps1 -Script "C:\Dev\AfterEffectClaude\scripts\probe-environment.jsx"

.EXAMPLE
  .\run-jsx.ps1 -Code "alert(app.version)"
#>
[CmdletBinding()]
param(
    [string]$Script,
    [string]$Code,
    [switch]$CheckOnly,
    [int]$TimeoutSeconds = 300
)

$AE = "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files"
$launcher = Join-Path $AE "AfterFX.com"

if (-not (Test-Path $launcher)) {
    throw "AfterFX.com not found at $launcher - is After Effects 2026 installed?"
}

$running = @(Get-Process -Name AfterFX -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
    Write-Host "After Effects is RUNNING (pid $($running[0].Id)) - the script will execute in that live instance." -ForegroundColor Yellow
} else {
    Write-Host "After Effects is not running - a new instance will be launched." -ForegroundColor Cyan
}
if ($CheckOnly) { return }

if ($Script) {
    if (-not (Test-Path $Script)) { throw "Script not found: $Script" }
    $full = (Resolve-Path $Script).Path
    Write-Host "Running $full"
    $aeArgs = @("-r", $full)
} elseif ($Code) {
    Write-Host "Running inline code"
    $aeArgs = @("-s", $Code)
} else {
    throw "Pass -Script <path.jsx> or -Code '<extendscript>'"
}

$p = Start-Process -FilePath $launcher -ArgumentList $aeArgs -NoNewWindow -PassThru
if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
    Write-Warning "Timed out after $TimeoutSeconds s - After Effects may be showing a dialog."
    return
}
Write-Host "Exit code: $($p.ExitCode)"
