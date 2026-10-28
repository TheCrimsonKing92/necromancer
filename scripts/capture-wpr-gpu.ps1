[CmdletBinding()]
param(
  [ValidateSet("benchmark", "probe")]
  [string]$Workload = "benchmark",
  [string]$OutputDirectory = "output/wpr-gpu",
  [string]$ExportProfile = "",
  [switch]$Elevate
)

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
$isAdministrator = $principal.IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdministrator) {
  if (-not $Elevate) {
    throw "WPR GPU capture requires Windows system-performance privilege. Run this command from an elevated terminal, or use the explicitly named npm :admin command to request UAC approval."
  }
  Write-Host "Requesting Windows administrator approval for the WPR GPU kernel trace..."
  $arguments = @(
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $PSCommandPath,
    "-Workload", $Workload,
    "-OutputDirectory", $OutputDirectory
  )
  if ($ExportProfile) {
    $arguments += @("-ExportProfile", $ExportProfile)
  }
  $elevated = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $arguments
  exit $elevated.ExitCode
}

$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDirectory))
if (-not $outputRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "WPR output must remain inside the repository."
}

$toolkitRoot = "C:\Program Files (x86)\Windows Kits\10\Windows Performance Toolkit"
$toolkitWpr = Join-Path $toolkitRoot "wpr.exe"
$wpr = if (Test-Path -LiteralPath $toolkitWpr) { $toolkitWpr } else { "wpr.exe" }
$wpaExporter = Join-Path $toolkitRoot "wpaexporter.exe"
$profilePath = Join-Path $repoRoot "scripts/necromancer-gpu-memory.wprp"
$profileSpec = "$profilePath!NecromancerGpuMemory.Verbose"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$captureRoot = Join-Path $outputRoot $timestamp
$etlPath = Join-Path $captureRoot "necromancer-gpu.etl"
$exportRoot = Join-Path $captureRoot "tables"
$metadataPath = Join-Path $captureRoot "capture.json"
$probeMetadataPath = Join-Path $captureRoot "probe-memory-infra.json"
$vidMmSummaryPath = Join-Path $captureRoot "vidmm-summary.json"

New-Item -ItemType Directory -Path $captureRoot -Force | Out-Null
$recordingStarted = $false
$workloadSucceeded = $false
$startedAt = (Get-Date).ToUniversalTime()

Push-Location $repoRoot
try {
  & $wpr -start $profileSpec -filemode
  if ($LASTEXITCODE -ne 0) {
    throw "WPR could not start the narrow GPU-memory profile (exit $LASTEXITCODE). Check for an active WPR session and verify the elevated process has system-profile privilege."
  }
  $recordingStarted = $true

  if ($Workload -eq "probe") {
    & node "scripts/probe-memory-infra.mjs" "--output=$probeMetadataPath"
  } else {
    & npm run "perf:trace:gpu:chrome"
  }
  if ($LASTEXITCODE -ne 0) {
    throw "The $Workload workload failed with exit code $LASTEXITCODE."
  }
  $workloadSucceeded = $true

  & $wpr -stop $etlPath
  if ($LASTEXITCODE -ne 0) {
    throw "WPR could not save the trace (exit $LASTEXITCODE)."
  }
  $recordingStarted = $false

  $analyzerArguments = @(
    "scripts/wpr-gpu-memory.mjs",
    "--etl=$etlPath",
    "--output=$vidMmSummaryPath"
  )
  if ($Workload -eq "probe") {
    $analyzerArguments += "--process-metadata=$probeMetadataPath"
  }
  & node $analyzerArguments
  if ($LASTEXITCODE -ne 0) {
    throw "The VidMm allocation analyzer failed with exit code $LASTEXITCODE. The ETL remains available at $etlPath."
  }

  $wpaProfilePath = if ($ExportProfile) {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ExportProfile))
  } else {
    ""
  }
  if ($wpaProfilePath) {
    if (-not (Test-Path -LiteralPath $wpaExporter)) {
      throw "WPAExporter is not installed. Install the Windows Performance Toolkit component of the ADK."
    }
    if (-not (Test-Path -LiteralPath $wpaProfilePath)) {
      throw "WPA export profile not found: $wpaProfilePath"
    }
    New-Item -ItemType Directory -Path $exportRoot -Force | Out-Null
    & $wpaExporter -i $etlPath -profile $wpaProfilePath -outputfolder $exportRoot -outputformat CSV
    if ($LASTEXITCODE -ne 0) {
      throw "WPAExporter failed with exit code $LASTEXITCODE."
    }
  }

  $metadata = [ordered]@{
    schemaVersion = 2
    workload = $Workload
    startedAt = $startedAt.ToString("o")
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    wprProfile = "NecromancerGpuMemory.Verbose"
    wprProfilePath = $profilePath
    wprPath = $wpr
    etlPath = $etlPath
    workloadSucceeded = $workloadSucceeded
    exporterPath = if (Test-Path -LiteralPath $wpaExporter) { $wpaExporter } else { $null }
    processMetadataPath = if ($Workload -eq "probe") { $probeMetadataPath } else { $null }
    vidMmSummaryPath = $vidMmSummaryPath
    exportProfile = if ($wpaProfilePath) { $wpaProfilePath } else { $null }
    exportDirectory = if ($wpaProfilePath) { $exportRoot } else { $null }
  }
  $metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $metadataPath -Encoding utf8
  Write-Host "WPR GPU trace: $etlPath"
  Write-Host "VidMm allocation summary: $vidMmSummaryPath"
  Write-Host "Capture metadata: $metadataPath"
} finally {
  if ($recordingStarted) {
    & $wpr -cancel 2>$null
  }
  Pop-Location
}
