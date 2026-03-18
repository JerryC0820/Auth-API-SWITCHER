import path from 'node:path';
import { app } from 'electron';
import fs from 'fs-extra';
import type { UpdateChannel, UpdateChannelOverride } from '../../shared/types';
import { updateChannels } from '../../shared/types';
import type { ResolvedUpdateChannelState } from './update-types';

const UPDATE_CHANNEL_OVERRIDE_FILE_NAME = 'update-channel.override.json';

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

const isUpdateChannel = (value?: string | null): value is UpdateChannel =>
  updateChannels.includes(value as UpdateChannel);

const getOverrideCandidatePaths = (): string[] => {
  const paths = new Set<string>();
  paths.add(path.join(app.getPath('userData'), UPDATE_CHANNEL_OVERRIDE_FILE_NAME));

  const executableDir = path.dirname(app.getPath('exe'));
  paths.add(path.join(executableDir, UPDATE_CHANNEL_OVERRIDE_FILE_NAME));

  if (!app.isPackaged) {
    paths.add(path.join(process.cwd(), UPDATE_CHANNEL_OVERRIDE_FILE_NAME));
  }

  return [...paths];
};

const normalizeOverride = (
  raw: unknown,
  sourcePath: string,
): UpdateChannelOverride | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const channel = normalizeText(String(record.channel ?? 'stable'));
  if (!isUpdateChannel(channel)) {
    return null;
  }

  const testerId = normalizeText(
    typeof record.testerId === 'string' ? record.testerId : String(record.testerId ?? ''),
  );

  return {
    channel,
    allowPrerelease: record.allowPrerelease === true,
    testerId: testerId || null,
    sourcePath,
  };
};

export const readResolvedUpdateChannelState = async (): Promise<ResolvedUpdateChannelState> => {
  for (const candidatePath of getOverrideCandidatePaths()) {
    try {
      if (!(await fs.pathExists(candidatePath))) {
        continue;
      }

      const raw = await fs.readJson(candidatePath);
      const override = normalizeOverride(raw, candidatePath);
      if (!override) {
        continue;
      }

      return {
        channel: override.channel,
        override,
        allowPrerelease: override.allowPrerelease,
        testerId: override.testerId,
      };
    } catch {
      // Ignore broken override files and keep the app on the stable channel.
    }
  }

  return {
    channel: 'stable',
    override: null,
    allowPrerelease: false,
    testerId: null,
  };
};
