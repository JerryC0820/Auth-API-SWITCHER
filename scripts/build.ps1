param(
  [switch]$SkipTypecheck,
  [switch]$SkipRenderer,
  [switch]$SkipElectron
)

$ErrorActionPreference = 'Stop'

npm run build:resources
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if (-not $SkipTypecheck) {
  npm run typecheck
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

if (-not $SkipRenderer) {
  npm run build:renderer
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

if (-not $SkipElectron) {
  npm run build:electron
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

exit 0
