<#
.SYNOPSIS
  Send a command to the AP-Bridge panel running inside After Effects and wait for the result.

.DESCRIPTION
  Writes .tmp/bridge/inbox/<id>.json, polls .tmp/bridge/outbox/<id>.json, prints the JSON
  result and deletes it. Requires AP-Bridge.jsx installed and "Listen" ticked in AE.

.EXAMPLE
  .\ae-send.ps1 -Action ping

.EXAMPLE
  .\ae-send.ps1 -Code "app.project.numItems"

.EXAMPLE
  .\ae-send.ps1 -Code (Get-Content .\scripts\make-comp.jsx -Raw) -Undo "AP: build comp"

.EXAMPLE
  .\ae-send.ps1 -Action status
#>
[CmdletBinding()]
param(
    [ValidateSet("eval","ping","probe","render","status")]
    [string]$Action = "eval",
    [string]$Code,
    [string]$Undo = "AP Bridge",
    [string]$Comp,
    [string]$Output,
    [int]$TimeoutSeconds = 60
)

$root   = "C:\Dev\AfterEffectClaude\.tmp\bridge"
$inbox  = Join-Path $root "inbox"
$outbox = Join-Path $root "outbox"

if ($Action -eq "status") {
    $s = Join-Path $root "status.json"
    if (Test-Path $s) { Get-Content $s -Raw } else { "No status.json - bridge has never run." }
    return
}

foreach ($d in @($root, $inbox, $outbox)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
}

$id = "ap-" + (Get-Random -Maximum 999999) + "-" + (Get-Date -Format "HHmmss")
$payload = @{ id = $id; action = $Action }
if ($Action -eq "eval")   { if (-not $Code) { throw "-Code is required for eval" }
                            $payload.code = $Code; $payload.undo = $Undo }
if ($Action -eq "render") { $payload.comp = $Comp; $payload.output = $Output }

$json = $payload | ConvertTo-Json -Compress -Depth 5
$reqPath = Join-Path $inbox "$id.json"
[System.IO.File]::WriteAllText($reqPath, $json, (New-Object System.Text.UTF8Encoding($false)))

$resPath = Join-Path $outbox "$id.json"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    if (Test-Path $resPath) {
        Start-Sleep -Milliseconds 60           # let the panel finish writing
        $out = Get-Content $resPath -Raw
        Remove-Item $resPath -Force
        $out
        return
    }
    Start-Sleep -Milliseconds 200
}

Write-Warning "No response in $TimeoutSeconds s. Is AE running with AP-Bridge 'Listen' ticked? (try -Action status)"
if (Test-Path $reqPath) { Remove-Item $reqPath -Force }
