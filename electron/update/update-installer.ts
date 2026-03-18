import { spawn } from 'node:child_process';
import { app, shell } from 'electron';

const escapeForPowerShellSingleQuotes = (value: string): string => value.replace(/'/g, "''");

export const launchWindowsInstaller = (installerPath: string): void => {
  const delayedCommand = [
    'Start-Sleep -Milliseconds 900',
    `Start-Process -FilePath '${escapeForPowerShellSingleQuotes(installerPath)}'`,
  ].join('; ');

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', delayedCommand],
    {
      detached: true,
      stdio: 'ignore',
    },
  );

  child.unref();
  setTimeout(() => {
    app.quit();
  }, 180);
};

export const revealDownloadedArtifact = async (filePath: string): Promise<void> => {
  shell.showItemInFolder(filePath);
};
