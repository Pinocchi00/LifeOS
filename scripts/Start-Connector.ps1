$ErrorActionPreference = "Stop"
$taskOldToken = $env:LIFEOS_GITHUB_TOKEN
$taskOldRepositories = $env:LIFEOS_GITHUB_REPOSITORIES
$taskSecureToken = $null
try {
    $taskRepositories = Read-Host "Dépôts autorisés (owner/repo,owner/autre)"
    $taskSecureToken = Read-Host "Jeton GitHub en lecture seule (saisie masquée, jamais enregistrée)" -AsSecureString
    $env:LIFEOS_GITHUB_TOKEN = [System.Net.NetworkCredential]::new("", $taskSecureToken).Password
    $env:LIFEOS_GITHUB_REPOSITORIES = $taskRepositories
    & node (Join-Path $PSScriptRoot "connector-start.mjs")
    $taskExitCode = $LASTEXITCODE
} finally {
    $env:LIFEOS_GITHUB_TOKEN = $taskOldToken
    $env:LIFEOS_GITHUB_REPOSITORIES = $taskOldRepositories
    if ($taskSecureToken) { $taskSecureToken.Dispose() }
}
exit $taskExitCode
