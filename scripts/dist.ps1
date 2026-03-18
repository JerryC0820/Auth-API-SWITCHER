param(
  [ValidateSet('win', 'mac', 'dir')]
  [string]$Target = 'win'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$builderCli = Join-Path $projectRoot 'node_modules\electron-builder\cli.js'
$isMacHost = $false

try {
  $isMacHost = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::OSX
  )
} catch {
  $isMacHost = $false
}

$commonArgs = @(
  $builderCli,
  '--publish',
  'never'
)
$winConfigArgs = @(
  '-c.win.signAndEditExecutable=false'
)

& (Join-Path $PSScriptRoot 'build.ps1')
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

switch ($Target) {
  'win' {
    $outputDir = 'release-artifacts/win'
    & node @commonArgs @winConfigArgs --win nsis "-c.directories.output=$outputDir"
    exit $LASTEXITCODE
  }
  'mac' {
    if (-not $isMacHost) {
      throw 'macOS packaging must run on a macOS host.'
    }

    $outputDir = 'release-artifacts/mac'
    & node @commonArgs --mac dmg zip --x64 --arm64 "-c.directories.output=$outputDir"
    exit $LASTEXITCODE
  }
  'dir' {
    $outputDir = 'release-artifacts/dir'
    & node @commonArgs @winConfigArgs --dir "-c.directories.output=$outputDir"
    exit $LASTEXITCODE
  }
}
