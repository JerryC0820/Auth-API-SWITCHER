param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ViteArgs = @()
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$viteCli = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$tempLogPath = Join-Path ([System.IO.Path]::GetTempPath()) 'auth-api-switcher-renderer-build.log'
$distRoot = Join-Path $projectRoot 'dist'
$buildStartedAt = Get-Date

if (Test-Path $tempLogPath) {
  Remove-Item $tempLogPath -Force -ErrorAction SilentlyContinue
}

if (Test-Path $distRoot) {
  Remove-Item $distRoot -Recurse -Force -ErrorAction SilentlyContinue
}

& node $viteCli build @ViteArgs 2>&1 | Tee-Object -FilePath $tempLogPath
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  exit 0
}

$distIndex = Join-Path $projectRoot 'dist\index.html'
$assetsDir = Join-Path $projectRoot 'dist\assets'
$jsAssets = @()
$cssAssets = @()

if (Test-Path $assetsDir) {
  $jsAssets = @(Get-ChildItem $assetsDir -Filter '*.js' -File -ErrorAction SilentlyContinue)
  $cssAssets = @(Get-ChildItem $assetsDir -Filter '*.css' -File -ErrorAction SilentlyContinue)
}

$distFiles = @()
if (Test-Path $distIndex) {
  $distFiles += Get-Item $distIndex -ErrorAction SilentlyContinue
}
$distFiles += $jsAssets
$distFiles += $cssAssets
$distFiles = @($distFiles | Where-Object { $_ })
$hasFreshDistOutput = $distFiles.Count -gt 0 -and (@($distFiles | Where-Object { $_.LastWriteTime -ge $buildStartedAt }).Count -eq $distFiles.Count)

$logText = if (Test-Path $tempLogPath) { Get-Content -Raw $tempLogPath } else { '' }
$hasFatalText = $logText -match '(?im)\berror during build\b|\bbuild failed\b|\bfailed to resolve\b|\btransform failed\b'

if (
  $exitCode -eq -1073740791 -and
  (Test-Path $distIndex) -and
  $jsAssets.Count -gt 0 -and
  $cssAssets.Count -gt 0 -and
  $hasFreshDistOutput -and
  -not $hasFatalText
) {
  Write-Warning 'Vite returned 0xC0000409, but dist output is complete. Continuing for this project.'
  exit 0
}

exit $exitCode
