param(
  [ValidateSet('RestartDev', 'DevElectronLoop', 'DevHostStart')]
  [string]$Mode = 'RestartDev',
  [int]$TargetPid = 0,
  [string]$ElectronArgs = ''
)

$ErrorActionPreference = 'Stop'

$projectPath = Split-Path -Parent $PSScriptRoot
$projectPattern = '*D:\AI-Code\项目开发-JERRY&Codex\Oauth切换免登版*'
$logPath = Join-Path $projectPath 'dev-runtime.log'
$errorPath = Join-Path $projectPath 'dev-runtime.err.log'
$currentPid = $PID
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source

if (-not $npmCommand) {
  throw 'npm.cmd was not found. Please verify that Node.js is installed correctly.'
}

if (-not $nodeCommand) {
  throw 'node.exe was not found. Please verify that Node.js is installed correctly.'
}

function Get-ListeningProcessIdsForPort {
  param(
    [int]$Port
  )

  $processIds = @()
  foreach ($line in (netstat -ano -p tcp)) {
    if ($line -match "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
      $processIds += [int]$Matches[1]
    }
  }

  return @($processIds | Select-Object -Unique)
}

function Get-ProcessInfosById {
  param(
    [int[]]$ProcessIds
  )

  if (-not $ProcessIds -or $ProcessIds.Count -eq 0) {
    return @()
  }

  return @(Get-CimInstance Win32_Process | Where-Object { $ProcessIds -contains $_.ProcessId })
}

function Test-IsProjectRendererProcess {
  param(
    $ProcessInfo
  )

  $commandLine = [string]$ProcessInfo.CommandLine
  if (-not $commandLine) {
    return $false
  }

  return (
    $ProcessInfo.Name -eq 'node.exe' -and
    $commandLine -like "*$projectPath*" -and
    $commandLine -like '*vite*'
  )
}

function Format-ProcessSummary {
  param(
    $ProcessInfo
  )

  $commandLine = ([string]$ProcessInfo.CommandLine).Trim()
  if ($commandLine.Length -gt 220) {
    $commandLine = $commandLine.Substring(0, 220) + '...'
  }

  return "PID $($ProcessInfo.ProcessId) $($ProcessInfo.Name) $commandLine"
}

if ($Mode -eq 'DevHostStart') {
  $rendererOwnerIds = @(Get-ListeningProcessIdsForPort -Port 5173)
  $rendererOwnerProcesses = @(Get-ProcessInfosById -ProcessIds $rendererOwnerIds)
  $projectRendererProcess = @(
    $rendererOwnerProcesses |
      Where-Object { Test-IsProjectRendererProcess -ProcessInfo $_ } |
      Select-Object -First 1
  )

  if ($projectRendererProcess.Count -gt 0) {
    $waitOnScript = Join-Path $projectPath 'node_modules\wait-on\bin\wait-on'
    $electronCliPath = Join-Path $projectPath 'node_modules\electron\cli.js'
    $electronMainPath = Join-Path $projectPath 'dist-electron\main.js'

    if (-not (Test-Path $electronMainPath)) {
      & $npmCommand 'run' 'build:electron'
      if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
      }
    }

    Push-Location $projectPath
    try {
      $env:VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173'
      $env:CODEX_WORKSPACE_LICENSE_HOST = '1'
      & $nodeCommand $waitOnScript 'tcp:5173' 'file:dist-electron/main.js'
      if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
      }

      & $nodeCommand $electronCliPath '.' 'license-host-mode'
      exit $LASTEXITCODE
    } finally {
      Pop-Location
    }
  }

  if ($rendererOwnerProcesses.Count -gt 0) {
    $processSummary = ($rendererOwnerProcesses | ForEach-Object {
      Format-ProcessSummary -ProcessInfo $_
    }) -join [Environment]::NewLine

    throw "端口 5173 当前被非本项目的进程占用。已停止复用，避免本地主机误接到旧界面。请先关闭这些进程后再重试：$([Environment]::NewLine)$processSummary"
  }

  & $npmCommand 'run' 'dev:host:fresh'
  exit $LASTEXITCODE
}

if ($Mode -eq 'DevElectronLoop') {
  $env:VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173'
  $waitOnScript = Join-Path $projectPath 'node_modules\wait-on\bin\wait-on'
  $electronCliPath = Join-Path $projectPath 'node_modules\electron\cli.js'
  $electronArgs = @('.')
  $combinedElectronArgs = @()
  if ($ElectronArgs) {
    $combinedElectronArgs += $ElectronArgs
  }
  if ($env:CODEX_WORKSPACE_ELECTRON_ARGS) {
    $combinedElectronArgs += $env:CODEX_WORKSPACE_ELECTRON_ARGS
  }
  if ($combinedElectronArgs -contains '--license-host' -or $combinedElectronArgs -contains 'license-host-mode') {
    $env:CODEX_WORKSPACE_LICENSE_HOST = '1'
  } else {
    Remove-Item Env:CODEX_WORKSPACE_LICENSE_HOST -ErrorAction SilentlyContinue
  }
  if ($combinedElectronArgs.Count -gt 0) {
    $electronArgs += ($combinedElectronArgs -join ' ' -split '\s+' | Where-Object { $_ })
  }

  Push-Location $projectPath
  try {
    while ($true) {
      & $nodeCommand $waitOnScript 'tcp:5173' 'file:dist-electron/main.js'
      if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
      }

      & $nodeCommand $electronCliPath @electronArgs
      $electronExitCode = $LASTEXITCODE
      if ($electronExitCode -ne 75) {
        exit $electronExitCode
      }

      Start-Sleep -Milliseconds 800
    }
  } finally {
    Pop-Location
  }
}

if ($TargetPid -gt 0) {
  $deadline = (Get-Date).AddSeconds(12)

  while ($true) {
    $targetProcess = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
    if (-not $targetProcess) {
      break
    }

    if ((Get-Date) -ge $deadline) {
      Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
      break
    }

    Start-Sleep -Milliseconds 250
  }
}

Get-CimInstance Win32_Process |
  Where-Object {
    $_.ProcessId -ne $currentPid -and
    ($_.Name -eq 'electron.exe' -or $_.Name -eq 'node.exe' -or $_.Name -eq 'cmd.exe') -and
    $_.CommandLine -like $projectPattern
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2

Remove-Item $logPath, $errorPath -Force -ErrorAction SilentlyContinue

Start-Process -FilePath $npmCommand `
  -WorkingDirectory $projectPath `
  -ArgumentList 'run', 'dev' `
  -WindowStyle Minimized `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError $errorPath

Start-Sleep -Seconds 8

Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, State, OwningProcess

Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq 'electron.exe' -or $_.Name -eq 'node.exe' -or $_.Name -eq 'cmd.exe') -and
    $_.CommandLine -like $projectPattern
  } |
  Select-Object ProcessId, Name, CommandLine
