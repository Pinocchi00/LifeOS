param(
    [Parameter(Mandatory = $true)][string]$Origin,
    [Parameter(Mandatory = $true)][string]$CertificateFile,
    [Parameter(Mandatory = $true)][string]$KeyFile,
    [ValidateSet("127.0.0.1", "0.0.0.0", "::")][string]$BindAddress = "127.0.0.1",
    [ValidateSet("Environment", "GitHub", "AI")][string]$Configure = "Environment"
)
$ErrorActionPreference = "Stop"
$taskNames = @("LIFEOS_REMOTE_ORIGIN", "LIFEOS_TLS_CERT_FILE", "LIFEOS_TLS_KEY_FILE", "LIFEOS_BIND_ADDRESS", "LIFEOS_CONNECTOR_PORT")
$taskPrevious = @{}
foreach ($taskName in $taskNames) { $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName, "Process") }
$taskExitCode = 1
try {
    $env:LIFEOS_REMOTE_ORIGIN = $Origin
    $env:LIFEOS_TLS_CERT_FILE = (Resolve-Path -LiteralPath $CertificateFile).ProviderPath
    $env:LIFEOS_TLS_KEY_FILE = (Resolve-Path -LiteralPath $KeyFile).ProviderPath
    $env:LIFEOS_BIND_ADDRESS = $BindAddress
    $env:LIFEOS_CONNECTOR_PORT = $null
    if ($Configure -eq "GitHub") {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "Start-Connector.ps1")
    } elseif ($Configure -eq "AI") {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "Start-AiConnector.ps1")
    } else {
        & node (Join-Path $PSScriptRoot "connector-start.mjs")
    }
    $taskExitCode = $LASTEXITCODE
} finally {
    foreach ($taskName in $taskNames) { [Environment]::SetEnvironmentVariable($taskName, $taskPrevious[$taskName], "Process") }
}
exit $taskExitCode
