$ErrorActionPreference = "Stop"
$taskOldKey = $env:LIFEOS_OPENAI_KEY
$taskOldUsd = $env:LIFEOS_AI_DAILY_USD
$taskOldCalls = $env:LIFEOS_AI_DAILY_CALLS
$taskSecureKey = $null
try {
    $taskUsd = Read-Host "Limite quotidienne en USD (0.10 a 10, point decimal)"
    $taskCalls = Read-Host "Nombre maximal d'essais par jour UTC (1 a 100)"
    $taskSecureKey = Read-Host "Cle API OpenAI (saisie masquee, jamais enregistree)" -AsSecureString
    $env:LIFEOS_OPENAI_KEY = [System.Net.NetworkCredential]::new("", $taskSecureKey).Password
    $env:LIFEOS_AI_DAILY_USD = $taskUsd
    $env:LIFEOS_AI_DAILY_CALLS = $taskCalls
    & node (Join-Path $PSScriptRoot "connector-start.mjs")
    $taskExitCode = $LASTEXITCODE
} finally {
    $env:LIFEOS_OPENAI_KEY = $taskOldKey
    $env:LIFEOS_AI_DAILY_USD = $taskOldUsd
    $env:LIFEOS_AI_DAILY_CALLS = $taskOldCalls
    if ($taskSecureKey) { $taskSecureKey.Dispose() }
}
exit $taskExitCode
