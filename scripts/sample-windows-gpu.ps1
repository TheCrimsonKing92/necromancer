[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetProcessIds,

    [ValidateRange(1, 10)]
    [int]$SampleIntervalSeconds = 1,

    [ValidateRange(2, 20)]
    [int]$SampleCount = 4
)

$ErrorActionPreference = "Stop"

try {
    $targetIds = @(
        $TargetProcessIds.Split(",") |
            ForEach-Object { [int]$_.Trim() } |
            Where-Object { $_ -gt 0 }
    )
    if ($targetIds.Count -eq 0) {
        throw "No valid GPU process IDs were supplied."
    }

    $counterPaths = @(
        "\GPU Engine(*)\Utilization Percentage",
        "\GPU Process Memory(*)\Dedicated Usage",
        "\GPU Process Memory(*)\Shared Usage"
    )
    $counterSets = @(
        Get-Counter `
            -Counter $counterPaths `
            -SampleInterval $SampleIntervalSeconds `
            -MaxSamples $SampleCount `
            -ErrorAction Stop
    )

    $samples = @(
        foreach ($counterSet in $counterSets) {
            $engineSamples = @()
            [double]$dedicatedBytes = 0
            [double]$sharedBytes = 0
            [int]$memoryInstanceCount = 0

            foreach ($counterSample in $counterSet.CounterSamples) {
                if (
                    $counterSample.InstanceName -notmatch "^pid_(\d+)_"
                ) {
                    continue
                }

                $sampleProcessId = [int]$Matches[1]
                if ($sampleProcessId -notin $targetIds) {
                    continue
                }

                [double]$value = $counterSample.CookedValue
                if (
                    [double]::IsNaN($value) -or
                    [double]::IsInfinity($value) -or
                    $value -lt 0
                ) {
                    continue
                }

                if (
                    $counterSample.Path -match
                    "\\GPU Engine\(.*\)\\Utilization Percentage$"
                ) {
                    $engineSamples += [ordered]@{
                        instance = $counterSample.InstanceName
                        percent = $value
                    }
                    continue
                }

                if (
                    $counterSample.Path -match
                    "\\GPU Process Memory\(.*\)\\Dedicated Usage$"
                ) {
                    $dedicatedBytes += $value
                    $memoryInstanceCount += 1
                    continue
                }

                if (
                    $counterSample.Path -match
                    "\\GPU Process Memory\(.*\)\\Shared Usage$"
                ) {
                    $sharedBytes += $value
                }
            }

            [ordered]@{
                timestamp = $counterSet.Timestamp.ToUniversalTime().
                    ToString("o")
                engines = @($engineSamples)
                dedicatedBytes = $dedicatedBytes
                sharedBytes = $sharedBytes
                memoryInstanceCount = $memoryInstanceCount
            }
        }
    )

    [ordered]@{
        status = "raw"
        source = "Windows Performance Counters"
        targetProcessIds = @($targetIds)
        sampleIntervalSeconds = $SampleIntervalSeconds
        requestedSamples = $SampleCount
        samples = @($samples)
    } | ConvertTo-Json -Depth 6 -Compress
}
catch {
    [ordered]@{
        status = "unavailable"
        source = "Windows Performance Counters"
        reason = (
            "Windows GPU performance counters could not be sampled: " +
            $_.Exception.Message
        )
    } | ConvertTo-Json -Depth 4 -Compress
}
