$ErrorActionPreference = "Stop"
$taskOldKey = $env:LIFEOS_OPENAI_KEY
$taskOldAnthropicKey = $env:LIFEOS_ANTHROPIC_KEY
$taskOldUsd = $env:LIFEOS_AI_DAILY_USD
$taskOldCalls = $env:LIFEOS_AI_DAILY_CALLS
$taskSecureKey = $null
$taskSecureAnthropicKey = $null
try {
    $taskProvider = Read-Host "Fournisseurs (1 = OpenAI, 2 = Anthropic, 3 = les deux)"
    if ($taskProvider -notin @("1", "2", "3")) { throw "Choisissez 1, 2 ou 3." }
    $taskUsd = Read-Host "Limite quotidienne commune en USD (0.10 a 10, point decimal)"
    $taskCalls = Read-Host "Nombre maximal commun d'essais par jour UTC (1 a 100)"
    $env:LIFEOS_OPENAI_KEY = $null
    $env:LIFEOS_ANTHROPIC_KEY = $null
    if ($taskProvider -in @("1", "3")) {
        $taskSecureKey = Read-Host "Cle API OpenAI (saisie masquee, jamais enregistree)" -AsSecureString
        $env:LIFEOS_OPENAI_KEY = [System.Net.NetworkCredential]::new("", $taskSecureKey).Password
    }
    if ($taskProvider -in @("2", "3")) {
        $taskSecureAnthropicKey = Read-Host "Cle API Anthropic (saisie masquee, jamais enregistree)" -AsSecureString
        $env:LIFEOS_ANTHROPIC_KEY = [System.Net.NetworkCredential]::new("", $taskSecureAnthropicKey).Password
    }
    $env:LIFEOS_AI_DAILY_USD = $taskUsd
    $env:LIFEOS_AI_DAILY_CALLS = $taskCalls
    & node (Join-Path $PSScriptRoot "connector-start.mjs")
    $taskExitCode = $LASTEXITCODE
} finally {
    $env:LIFEOS_OPENAI_KEY = $taskOldKey
    $env:LIFEOS_ANTHROPIC_KEY = $taskOldAnthropicKey
    $env:LIFEOS_AI_DAILY_USD = $taskOldUsd
    $env:LIFEOS_AI_DAILY_CALLS = $taskOldCalls
    if ($taskSecureKey) { $taskSecureKey.Dispose() }
    if ($taskSecureAnthropicKey) { $taskSecureAnthropicKey.Dispose() }
}
exit $taskExitCode
