!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!ifdef BUILD_UNINSTALLER
  Var KeepLocalDataCheckbox
  Var DeleteLocalDataOnUninstall
  Var ProfilesRootDirCache

  !macro customUnWelcomePage
    UninstPage custom un.CustomUnWelcomePageCreate un.CustomUnWelcomePageLeave
  !macroend

  Function un.CustomUnWelcomePageCreate
    StrCpy $DeleteLocalDataOnUninstall "0"
    StrCpy $ProfilesRootDirCache "C:\codex-profiles"

    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0u 100% 18u "卸载 Auth API Switcher"
    Pop $0
    SetCtlColors $0 "F3F7FF" transparent

    ${NSD_CreateLabel} 0 20u 100% 30u "你可以保留本地配置、授权缓存、本地授权主机记录和 Codex 切换目录。取消勾选后，卸载程序会一并清理这些本地数据。"
    Pop $0
    SetCtlColors $0 "C7D2E0" transparent

    ${NSD_CreateCheckbox} 0 58u 100% 12u "保留本地配置、授权记录和 Codex 切换文件"
    Pop $KeepLocalDataCheckbox
    ${NSD_Check} $KeepLocalDataCheckbox

    ${NSD_CreateLabel} 12u 78u 100% 30u "保留时：不会删除本机切换目录和授权缓存。取消勾选时：会删除 AppData 中的本地数据，以及当前记录的 profile 根目录。"
    Pop $0
    SetCtlColors $0 "9AA8BC" transparent

    nsDialogs::Show
  FunctionEnd

  Function un.CustomUnWelcomePageLeave
    ${NSD_GetState} $KeepLocalDataCheckbox $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $DeleteLocalDataOnUninstall "0"
    ${Else}
      StrCpy $DeleteLocalDataOnUninstall "1"
    ${EndIf}
  FunctionEnd

  Function un.ResolveProfilesRootDir
    StrCpy $ProfilesRootDirCache "C:\codex-profiles"
    SetShellVarContext current

    StrCpy $0 "$APPDATA\codex-workspace-switcher\app-settings.json"
    IfFileExists "$0" 0 done

    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference=''Stop''; $$settingsPath = Join-Path ([Environment]::GetFolderPath(''ApplicationData'')) ''codex-workspace-switcher\app-settings.json''; if (Test-Path -LiteralPath $$settingsPath) { try { $$json = Get-Content -LiteralPath $$settingsPath -Raw | ConvertFrom-Json; if ($$json.profilesRootDir) { [Console]::Write([string]$$json.profilesRootDir) } } catch {} }"'
    Pop $1
    Pop $2

    ${If} $1 == 0
    ${AndIf} $2 != ""
      StrCpy $ProfilesRootDirCache $2
    ${EndIf}

  done:
  FunctionEnd

  !macro customUnInstall
    ${If} $DeleteLocalDataOnUninstall == "1"
      Call un.ResolveProfilesRootDir

      SetShellVarContext current
      RMDir /r "$APPDATA\codex-workspace-switcher"
      RMDir /r "$APPDATA\codex-workspace-switcher-license-host"

      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
      !endif

      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif

      IfFileExists "$ProfilesRootDirCache\*.*" 0 +2
        RMDir /r "$ProfilesRootDirCache"
    ${EndIf}
  !macroend
!endif
