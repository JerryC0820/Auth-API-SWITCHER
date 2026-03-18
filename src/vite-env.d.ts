/// <reference types="vite/client" />

import type { CodexWorkspaceApi } from '../shared/ipc';

declare global {
  interface Window {
    codexWorkspace: CodexWorkspaceApi;
  }
}
