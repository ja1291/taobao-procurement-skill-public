$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

$dockerCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'),
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
)
$docker = $dockerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$docker) { throw 'Docker Desktop is not installed.' }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }

& $docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not ready. Restart Windows if WSL was just installed, then open Docker Desktop and wait for its engine to start.'
}
& $docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose configuration failed validation.' }
& $docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Container build/start failed. Read the error above.' }

$connected = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $runtimeStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:17890/status' -TimeoutSec 5
        if ($runtimeStatus.extensionConnected -eq $true) {
            $connected = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 2
}
if (!$connected) { throw 'The browser extension did not connect. Run docker compose logs to inspect the services.' }
& node (Join-Path $repoRoot 'cli\brs.js') status
if ($LASTEXITCODE -ne 0) { throw 'Runtime status check failed.' }
Write-Host 'Runtime ready. Browser: http://127.0.0.1:16080/vnc.html?autoconnect=true&resize=remote'
Write-Host 'Taobao search and exact-match ranking have not been verified yet.'
