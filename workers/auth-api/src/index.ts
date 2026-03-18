import { nanoid } from 'nanoid';
import type {
  ApplyActivationCodeInput,
  ApplyRewardCodeInput,
  AuthActionResult,
  AuthState,
  DeviceIdentity,
  HeartbeatBootstrap,
  InviteRecord,
  InviteRecordsResult,
  LicenseSummary,
  LoginInput,
  PasswordResetInput,
  RedeemInviteCodeInput,
  RegisterInput,
  RewardRecord,
  UserProfile,
} from '../../../shared/types';
import { hashPassword, randomHex, sha256Hex, verifyPassword } from './crypto';
import {
  applyDurationToLicense,
  buildBootstrap,
  buildInviteProgress,
  compareVersions,
  createInactiveLicense,
  createTrialLicense,
  formatRemainingLabel,
  isFormalLicense,
  parseManualCode,
  rewardFromStage,
} from './licensing';

interface Env {
  AUTH_DB?: D1Database;
  APP_ENV?: string;
  APP_BASE_URL?: string;
  MIN_SUPPORTED_VERSION?: string;
  MANDATORY_UPDATE?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO?: string;
}

interface JsonObject {
  [key: string]: unknown;
}

interface DbUserRow {
  id: string;
  email: string;
  display_name: string;
  role_label: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

interface DbDeviceRow {
  id: string;
  user_id: string | null;
  fingerprint_hash: string;
  fingerprint_summary: string;
  host_label: string;
  platform_label: string;
  machine_name: string;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

interface DbLicenseRow {
  id: string;
  user_id: string;
  status: LicenseSummary['status'];
  license_type_label: string;
  duration_key: LicenseSummary['durationKey'];
  expires_at: string | null;
  permanent: number;
  source: LicenseSummary['source'];
  source_label: string;
  stage_label: string;
  activated_at: string | null;
  last_validated_at: string | null;
  rollback_detected: number;
  grace_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbInviteCodeRow {
  id: string;
  user_id: string;
  code: string;
  status: 'issued' | 'redeemed' | 'expired' | 'revoked';
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  redeemed_by_device_id: string | null;
}

interface DbInviteRecordRow {
  id: string;
  user_id: string;
  created_at: string;
  target_device_id: string;
  target_label: string;
  result: string;
  reward_label: string;
  stage: number;
  status: InviteRecord['status'];
  by_current_user: number;
}

interface DbRewardRecordRow {
  id: string;
  user_id: string;
  created_at: string;
  code: string;
  result: string;
  reward_label: string;
  status: RewardRecord['status'];
}

interface DbSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  last_seen_at: string;
}

interface AuthRequestBody {
  currentVersion?: string;
  device?: DeviceIdentity;
}

interface SessionContext {
  session: DbSessionRow;
  user: DbUserRow;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const json = (payload: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
    ...init,
  });

const error = (status: number, message: string, details?: string): Response =>
  json(
    {
      ok: false,
      error: {
        message,
        details: details ?? null,
      },
    },
    { status },
  );

const nowIso = (): string => new Date().toISOString();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const asBoolean = (value: string | undefined, fallback = false): boolean => {
  if (!value) {
    return fallback;
  }
  return value === 'true' || value === '1' || value === 'yes';
};

const toAvatarText = (displayName: string, email: string): string => {
  const source = displayName.trim() || email.trim();
  const plain = source.replace(/[^A-Za-z0-9\u4E00-\u9FFF]/g, '').slice(0, 2);
  return (plain || 'U').toUpperCase();
};

const userInviteCode = (userId: string): string => `INV-${userId.slice(-4).toUpperCase()}`;

const toUserProfile = (row: DbUserRow): UserProfile => ({
  id: row.id,
  displayName: row.display_name,
  email: row.email,
  avatarText: toAvatarText(row.display_name, row.email),
  roleLabel: row.role_label,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toInviteRecord = (row: DbInviteRecordRow): InviteRecord => ({
  id: row.id,
  createdAt: row.created_at,
  targetDeviceId: row.target_device_id,
  targetLabel: row.target_label,
  result: row.result,
  rewardLabel: row.reward_label,
  stage: row.stage,
  status: row.status,
  byCurrentUser: Boolean(row.by_current_user),
});

const toRewardRecord = (row: DbRewardRecordRow): RewardRecord => ({
  id: row.id,
  createdAt: row.created_at,
  code: row.code,
  result: row.result,
  rewardLabel: row.reward_label,
  status: row.status,
});

const toLicenseSummary = (row: DbLicenseRow | null): LicenseSummary => {
  if (!row) {
    return createInactiveLicense();
  }

  const expiresAt = row.expires_at;
  const permanent = Boolean(row.permanent);
  const expired = !permanent && expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;

  return {
    status: expired ? 'expired' : row.status,
    licenseTypeLabel: row.license_type_label,
    durationKey: row.duration_key,
    expiresAt,
    permanent,
    source: row.source,
    sourceLabel: row.source_label,
    stageLabel: row.stage_label,
    remainingLabel: formatRemainingLabel(expiresAt, permanent),
    activatedAt: row.activated_at,
    lastValidatedAt: row.last_validated_at,
    rollbackDetected: Boolean(row.rollback_detected),
    graceExpiresAt: row.grace_expires_at,
  };
};

const requireDb = (env: Env): D1Database => {
  if (!env.AUTH_DB) {
    throw new Error('AUTH_DB 未绑定，请先在 wrangler.jsonc 配置 d1_databases。');
  }

  return env.AUTH_DB;
};

const parseBody = async <T>(request: Request): Promise<T> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {} as T;
  }

  return (await request.json()) as T;
};

const first = async <T>(db: D1Database, sql: string, bindings: unknown[] = []): Promise<T | null> =>
  (await db.prepare(sql).bind(...bindings).first<T>()) ?? null;

const all = async <T>(db: D1Database, sql: string, bindings: unknown[] = []): Promise<T[]> => {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results ?? [];
};

const run = async (db: D1Database, sql: string, bindings: unknown[] = []): Promise<void> => {
  await db.prepare(sql).bind(...bindings).run();
};

const ensureSession = async (env: Env, request: Request): Promise<SessionContext> => {
  const db = requireDb(env);
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    throw new Error('缺少登录令牌。');
  }

  const tokenHash = await sha256Hex(token);
  const session = await first<DbSessionRow>(
    db,
    'SELECT * FROM sessions WHERE token_hash = ? LIMIT 1',
    [tokenHash],
  );
  if (!session) {
    throw new Error('登录令牌无效或已过期。');
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await run(db, 'DELETE FROM sessions WHERE id = ?', [session.id]);
    throw new Error('登录会话已过期，请重新登录。');
  }

  const user = await first<DbUserRow>(db, 'SELECT * FROM users WHERE id = ? LIMIT 1', [session.user_id]);
  if (!user) {
    throw new Error('当前会话对应的账号不存在。');
  }

  await run(db, 'UPDATE sessions SET last_seen_at = ?, updated_at = ? WHERE id = ?', [
    nowIso(),
    nowIso(),
    session.id,
  ]);

  return { session, user };
};

const ensureDevice = async (
  db: D1Database,
  userId: string | null,
  device: DeviceIdentity | undefined,
): Promise<DeviceIdentity | null> => {
  if (!device) {
    return null;
  }

  const existing = await first<DbDeviceRow>(db, 'SELECT * FROM devices WHERE id = ? LIMIT 1', [device.deviceId]);
  const now = nowIso();

  if (existing) {
    await run(
      db,
      `UPDATE devices
       SET user_id = ?, fingerprint_hash = ?, fingerprint_summary = ?, host_label = ?, platform_label = ?,
           machine_name = ?, last_seen_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        userId,
        device.fingerprintHash,
        device.fingerprintSummary,
        device.hostLabel,
        device.platformLabel,
        device.machineName,
        now,
        now,
        device.deviceId,
      ],
    );
  } else {
    await run(
      db,
      `INSERT INTO devices (
        id, user_id, fingerprint_hash, fingerprint_summary, host_label, platform_label,
        machine_name, first_seen_at, last_seen_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device.deviceId,
        userId,
        device.fingerprintHash,
        device.fingerprintSummary,
        device.hostLabel,
        device.platformLabel,
        device.machineName,
        now,
        now,
        now,
      ],
    );
  }

  return device;
};

const readLatestDevice = async (db: D1Database, userId: string): Promise<DeviceIdentity | null> => {
  const row = await first<DbDeviceRow>(
    db,
    'SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 1',
    [userId],
  );
  if (!row) {
    return null;
  }

  return {
    deviceId: row.id,
    fingerprintHash: row.fingerprint_hash,
    fingerprintSummary: row.fingerprint_summary,
    hostLabel: row.host_label,
    platformLabel: row.platform_label,
    machineName: row.machine_name,
  };
};

const saveLicense = async (db: D1Database, userId: string, license: LicenseSummary): Promise<void> => {
  const existing = await first<DbLicenseRow>(db, 'SELECT * FROM licenses WHERE user_id = ? LIMIT 1', [userId]);
  const now = nowIso();

  if (existing) {
    await run(
      db,
      `UPDATE licenses
       SET status = ?, license_type_label = ?, duration_key = ?, expires_at = ?, permanent = ?,
           source = ?, source_label = ?, stage_label = ?, activated_at = ?, last_validated_at = ?,
           rollback_detected = ?, grace_expires_at = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        license.status,
        license.licenseTypeLabel,
        license.durationKey,
        license.expiresAt,
        license.permanent ? 1 : 0,
        license.source,
        license.sourceLabel,
        license.stageLabel,
        license.activatedAt,
        license.lastValidatedAt,
        license.rollbackDetected ? 1 : 0,
        license.graceExpiresAt,
        now,
        userId,
      ],
    );
    return;
  }

  await run(
    db,
    `INSERT INTO licenses (
      id, user_id, status, license_type_label, duration_key, expires_at, permanent, source,
      source_label, stage_label, activated_at, last_validated_at, rollback_detected,
      grace_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nanoid(12),
      userId,
      license.status,
      license.licenseTypeLabel,
      license.durationKey,
      license.expiresAt,
      license.permanent ? 1 : 0,
      license.source,
      license.sourceLabel,
      license.stageLabel,
      license.activatedAt,
      license.lastValidatedAt,
      license.rollbackDetected ? 1 : 0,
      license.graceExpiresAt,
      now,
      now,
    ],
  );
};

const readLicense = async (db: D1Database, userId: string): Promise<LicenseSummary> =>
  toLicenseSummary(await first<DbLicenseRow>(db, 'SELECT * FROM licenses WHERE user_id = ? LIMIT 1', [userId]));

const ensureLicenseAfterSignIn = async (db: D1Database, userId: string): Promise<LicenseSummary> => {
  const current = await readLicense(db, userId);
  if (current.status === 'inactive' || current.status === 'expired') {
    const trial = createTrialLicense();
    await saveLicense(db, userId, trial);
    return trial;
  }

  await saveLicense(db, userId, current);
  return current;
};

const readInviteRecords = async (db: D1Database, userId: string): Promise<InviteRecord[]> => {
  const rows = await all<DbInviteRecordRow>(
    db,
    'SELECT * FROM invite_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [userId],
  );
  return rows.map(toInviteRecord);
};

const readRewardRecords = async (db: D1Database, userId: string): Promise<RewardRecord[]> => {
  const rows = await all<DbRewardRecordRow>(
    db,
    'SELECT * FROM reward_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [userId],
  );
  return rows.map(toRewardRecord);
};

const readInviteProgress = async (
  db: D1Database,
  userId: string,
  license: LicenseSummary,
): Promise<ReturnType<typeof buildInviteProgress>> => {
  const inviteCode = userInviteCode(userId);
  const activeInvite = await first<DbInviteCodeRow>(
    db,
    "SELECT * FROM invite_codes WHERE user_id = ? AND status = 'issued' ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  const invitedCountRow = await first<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM invite_records WHERE user_id = ? AND by_current_user = 0',
    [userId],
  );
  const successfulCountRow = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM invite_records WHERE user_id = ? AND by_current_user = 0 AND status IN ('reward-ready', 'claimed')",
    [userId],
  );
  const pendingCountRow = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM invite_records WHERE user_id = ? AND status = 'reward-ready'",
    [userId],
  );
  const slotsUsedRow = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM reward_records WHERE user_id = ? AND reward_label LIKE '%永久%' AND status = 'applied'",
    [userId],
  );

  return buildInviteProgress(
    inviteCode,
    activeInvite?.code ?? null,
    invitedCountRow?.count ?? 0,
    successfulCountRow?.count ?? 0,
    pendingCountRow?.count ?? 0,
    slotsUsedRow?.count ?? 0,
    license,
  );
};

const buildAuthState = async (
  env: Env,
  user: DbUserRow,
  currentVersion: string,
  deviceOverride?: DeviceIdentity | null,
  notice: string | null = null,
): Promise<AuthState> => {
  const db = requireDb(env);
  const license = await readLicense(db, user.id);
  const inviteRecords = await readInviteRecords(db, user.id);
  const rewardRecords = await readRewardRecords(db, user.id);
  const device = deviceOverride ?? (await readLatestDevice(db, user.id));
  if (!device) {
    throw new Error('未找到当前账号的设备信息，请重新登录一次。');
  }

  return {
    sessionStatus: 'authenticated',
    profile: toUserProfile(user),
    device,
    license,
    invite: await readInviteProgress(db, user.id, license),
    inviteRecords,
    rewardRecords,
    bootstrap: buildBootstrap(
      currentVersion,
      env.MIN_SUPPORTED_VERSION ?? null,
      asBoolean(env.MANDATORY_UPDATE, false),
      notice ?? '当前已经切到 Cloudflare Workers + D1 在线层。',
    ),
    lastAuthAction: null,
  };
};

const createSession = async (db: D1Database, userId: string): Promise<string> => {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await run(
    db,
    `INSERT INTO sessions (id, user_id, token_hash, created_at, updated_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nanoid(12), userId, tokenHash, now, now, expiresAt, now],
  );

  return token;
};

const createAuthAction = async (
  env: Env,
  user: DbUserRow,
  currentVersion: string,
  message: string,
  device: DeviceIdentity | null,
  sessionToken?: string,
  notice: string | null = null,
): Promise<Response> => {
  const state = await buildAuthState(env, user, currentVersion, device, notice);
  const payload: AuthActionResult & { sessionToken?: string } = {
    state,
    message,
  };

  if (sessionToken) {
    payload.sessionToken = sessionToken;
  }

  return json(payload);
};

const resolveCurrentVersion = (payload: JsonObject): string => {
  const raw = typeof payload.currentVersion === 'string' ? payload.currentVersion.trim() : '';
  return raw || '0.0.0';
};

const ensureVersionAllowed = (env: Env, currentVersion: string): void => {
  const minSupportedVersion = env.MIN_SUPPORTED_VERSION?.trim();
  if (minSupportedVersion && compareVersions(currentVersion, minSupportedVersion) < 0) {
    throw new Error(`当前版本过低，最低支持版本为 ${minSupportedVersion}。`);
  }
};

const createPasswordResetEmail = (
  email: string,
  token: string,
  appBaseUrl: string | undefined,
): { subject: string; html: string; text: string } => {
  const trimmedBase = appBaseUrl?.trim();
  const resetUrl = trimmedBase
    ? `${trimmedBase.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`
    : null;

  const subject = 'Auth API Switcher 密码重置请求';
  const html = resetUrl
    ? `<p>收到重置密码请求。</p><p>请点击下面链接继续：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>如果不是你本人操作，请忽略此邮件。</p>`
    : `<p>收到重置密码请求。</p><p>当前未配置前端重置地址，请把下面的 token 交给管理员或后续重置页面使用：</p><pre>${token}</pre>`;
  const text = resetUrl
    ? `收到重置密码请求，请访问以下链接继续：\n${resetUrl}\n\n如果不是你本人操作，请忽略此邮件。`
    : `收到重置密码请求。当前未配置前端重置地址，请记录此 token：\n${token}`;

  return { subject, html, text };
};

const sendPasswordResetMail = async (
  env: Env,
  to: string,
  token: string,
): Promise<{ delivered: boolean; provider: 'resend' | 'disabled'; message: string }> => {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      delivered: false,
      provider: 'disabled',
      message: 'Resend 尚未配置，已创建重置请求但未发送邮件。',
    };
  }

  const email = createPasswordResetEmail(to, token, env.APP_BASE_URL);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      reply_to: env.RESEND_REPLY_TO ? [env.RESEND_REPLY_TO] : undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return {
      delivered: false,
      provider: 'resend',
      message: `Resend 发送失败：${details}`,
    };
  }

  return {
    delivered: true,
    provider: 'resend',
    message: '密码重置邮件已通过 Resend 发送。',
  };
};

const handleRegister = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const payload = await parseBody<RegisterInput & AuthRequestBody>(request);
  const email = normalizeEmail(payload.email ?? '');
  const displayName = payload.displayName?.trim() ?? '';
  const password = payload.password?.trim() ?? '';
  const currentVersion = resolveCurrentVersion(payload as JsonObject);

  if (!displayName) {
    return error(400, '请输入用户名。');
  }
  if (!email) {
    return error(400, '请输入邮箱。');
  }
  if (!password) {
    return error(400, '请输入密码。');
  }

  ensureVersionAllowed(env, currentVersion);

  const existing = await first<DbUserRow>(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing) {
    return error(409, '该邮箱已经注册。');
  }

  const now = nowIso();
  const userId = nanoid(12);
  const passwordSalt = randomHex(16);
  const passwordHash = await hashPassword(password, passwordSalt);

  await run(
    db,
    `INSERT INTO users (
      id, email, display_name, role_label, password_hash, password_salt, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, displayName, '已登录账号', passwordHash, passwordSalt, now, now],
  );

  await ensureDevice(db, userId, payload.device);
  await saveLicense(db, userId, createTrialLicense());
  const user = (await first<DbUserRow>(db, 'SELECT * FROM users WHERE id = ? LIMIT 1', [userId])) as DbUserRow;
  const sessionToken = await createSession(db, userId);
  return createAuthAction(
    env,
    user,
    currentVersion,
    `注册成功，已为 ${displayName} 创建账号。`,
    payload.device ?? null,
    sessionToken,
  );
};

const handleLogin = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const payload = await parseBody<LoginInput & AuthRequestBody>(request);
  const email = normalizeEmail(payload.email ?? '');
  const password = payload.password?.trim() ?? '';
  const currentVersion = resolveCurrentVersion(payload as JsonObject);

  if (!email) {
    return error(400, '请输入邮箱。');
  }
  if (!password) {
    return error(400, '请输入密码。');
  }

  ensureVersionAllowed(env, currentVersion);

  const user = await first<DbUserRow>(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) {
    return error(404, '该邮箱尚未注册。');
  }

  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) {
    return error(401, '密码不正确。');
  }

  await ensureDevice(db, user.id, payload.device);
  await ensureLicenseAfterSignIn(db, user.id);
  const sessionToken = await createSession(db, user.id);
  return createAuthAction(
    env,
    user,
    currentVersion,
    `登录成功，欢迎回来 ${user.display_name}。`,
    payload.device ?? null,
    sessionToken,
  );
};

const handleRequestPasswordReset = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const payload = await parseBody<PasswordResetInput>(request);
  const email = normalizeEmail(payload.email ?? '');

  if (!email) {
    return error(400, '请输入邮箱。');
  }

  const user = await first<DbUserRow>(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user) {
    return json({
      ok: true,
      message: `如果 ${email} 已注册，系统会向该地址发送重置邮件。`,
    });
  }

  const token = randomHex(24);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await run(
    db,
    `INSERT INTO password_reset_requests (
      id, user_id, email, token_hash, status, requested_at, consumed_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nanoid(12), user.id, user.email, tokenHash, 'issued', now, null, expiresAt],
  );

  const delivery = await sendPasswordResetMail(env, user.email, token);
  return json({
    ok: true,
    message: delivery.delivered
      ? `已向 ${user.email} 发送重置邮件。`
      : `已创建重置请求，但邮件未发送：${delivery.message}`,
    delivery,
  });
};

const handleGetProfile = async (env: Env, request: Request): Promise<Response> => {
  const { user } = await ensureSession(env, request);
  return json(await buildAuthState(env, user, env.MIN_SUPPORTED_VERSION ?? '0.0.0'));
};

const handleGetLicenseSummary = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  return json(await readLicense(db, user.id));
};

const handleApplyActivationCode = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<ApplyActivationCodeInput & AuthRequestBody>(request);
  const code = payload.code?.trim() ?? '';
  const currentVersion = resolveCurrentVersion(payload as JsonObject);

  if (!code) {
    return error(400, '请输入授权码。');
  }

  const current = await readLicense(db, user.id);
  const duration = parseManualCode(code);
  const next = applyDurationToLicense(
    current,
    duration,
    'activation',
    '在线激活码',
    duration.permanent ? '已激活永久授权' : `已录入授权码 ${code.slice(-4).toUpperCase()}`,
  );
  await saveLicense(db, user.id, next);
  return createAuthAction(
    env,
    user,
    currentVersion,
    duration.permanent ? '永久授权已生效。' : `${duration.typeLabel} 已生效。`,
    payload.device ?? null,
  );
};

const handleRequestInviteCode = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<AuthRequestBody>(request);
  const currentVersion = resolveCurrentVersion(payload as JsonObject);
  const license = await readLicense(db, user.id);

  if (!isFormalLicense(license)) {
    return error(403, '当前账号还不是正式授权，暂不能申请邀请码。');
  }

  const code = `${userInviteCode(user.id)}-${nanoid(6).toUpperCase()}`;
  await run(
    db,
    "UPDATE invite_codes SET status = 'revoked' WHERE user_id = ? AND status = 'issued'",
    [user.id],
  );
  await run(
    db,
    `INSERT INTO invite_codes (
      id, user_id, code, status, created_at, redeemed_at, redeemed_by_user_id, redeemed_by_device_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nanoid(12), user.id, code, 'issued', nowIso(), null, null, null],
  );

  return createAuthAction(env, user, currentVersion, `已生成 one-time invite code：${code}`, payload.device ?? null);
};

const handleRedeemInviteCode = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<RedeemInviteCodeInput & AuthRequestBody>(request);
  const code = payload.code?.trim().toUpperCase() ?? '';
  const currentVersion = resolveCurrentVersion(payload as JsonObject);

  if (!code) {
    return error(400, '请输入邀请码。');
  }
  if (!payload.device) {
    return error(400, '兑换邀请码时必须带上当前设备信息。');
  }

  const inviteCode = await first<DbInviteCodeRow>(
    db,
    "SELECT * FROM invite_codes WHERE code = ? AND status = 'issued' LIMIT 1",
    [code],
  );
  if (!inviteCode) {
    return error(404, '邀请码不存在或已经失效。');
  }
  if (inviteCode.user_id === user.id) {
    return error(400, '不能兑换自己生成的邀请码。');
  }

  const inviter = await first<DbUserRow>(db, 'SELECT * FROM users WHERE id = ? LIMIT 1', [inviteCode.user_id]);
  if (!inviter) {
    return error(404, '邀请码归属账号不存在。');
  }

  const inviterLicense = await readLicense(db, inviter.id);
  if (!isFormalLicense(inviterLicense)) {
    return error(403, '邀请人当前不是正式授权，邀请码暂不可用。');
  }

  const redeemedByDevice = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM invite_codes WHERE redeemed_by_device_id = ? AND status = 'redeemed'",
    [payload.device.deviceId],
  );
  if ((redeemedByDevice?.count ?? 0) > 0) {
    return error(409, '当前设备已经兑换过邀请码。');
  }

  await ensureDevice(db, user.id, payload.device);
  const inviterSuccessRow = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM invite_records WHERE user_id = ? AND by_current_user = 0 AND status IN ('reward-ready', 'claimed')",
    [inviter.id],
  );
  const stage = (inviterSuccessRow?.count ?? 0) + 1;
  const pendingRewardLabel =
    stage === 1 ? '+7 天待领取' : stage === 2 ? '+30 天待领取' : '永久待领取';

  await run(
    db,
    "UPDATE invite_codes SET status = 'redeemed', redeemed_at = ?, redeemed_by_user_id = ?, redeemed_by_device_id = ? WHERE id = ?",
    [nowIso(), user.id, payload.device.deviceId, inviteCode.id],
  );
  await run(
    db,
    `INSERT INTO invite_records (
      id, user_id, created_at, target_device_id, target_label, result, reward_label, stage, status, by_current_user
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nanoid(12),
      inviter.id,
      nowIso(),
      payload.device.deviceId,
      payload.device.machineName || payload.device.hostLabel,
      '新设备兑换成功，奖励待领取',
      pendingRewardLabel,
      stage,
      'reward-ready',
      0,
    ],
  );
  await run(
    db,
    `INSERT INTO invite_records (
      id, user_id, created_at, target_device_id, target_label, result, reward_label, stage, status, by_current_user
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nanoid(12),
      user.id,
      nowIso(),
      payload.device.deviceId,
      inviter.display_name,
      '已兑换他人邀请码，当前设备获得 1 天体验',
      '+1 天体验',
      0,
      'redeemed',
      1,
    ],
  );

  const currentLicense = await readLicense(db, user.id);
  const next = applyDurationToLicense(
    currentLicense.status === 'inactive' ? null : currentLicense,
    { permanent: false, days: 1, typeLabel: '邀请码兑换体验 / 1 天', durationKey: 'one-day' },
    'invite',
    '邀请码兑换',
    '已兑换他人邀请码',
  );
  await saveLicense(db, user.id, next);

  return createAuthAction(env, user, currentVersion, '邀请码兑换成功，当前设备已获得体验时长。', payload.device);
};

const handleClaimInviteReward = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<AuthRequestBody>(request);
  const currentVersion = resolveCurrentVersion(payload as JsonObject);
  const pending = await first<DbInviteRecordRow>(
    db,
    "SELECT * FROM invite_records WHERE user_id = ? AND status = 'reward-ready' ORDER BY created_at ASC LIMIT 1",
    [user.id],
  );
  if (!pending) {
    return error(404, '当前没有待领取的邀请奖励。');
  }

  const slotsUsedRow = await first<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM reward_records WHERE user_id = ? AND reward_label LIKE '%永久%' AND status = 'applied'",
    [user.id],
  );
  const duration = rewardFromStage(pending.stage, slotsUsedRow?.count ?? 0);
  const current = await readLicense(db, user.id);
  const next = applyDurationToLicense(
    current,
    duration,
    duration.permanent ? 'invite' : 'reward',
    '邀请奖励',
    duration.permanent ? '已升级为邀请永久授权' : '已领取邀请奖励',
  );
  await saveLicense(db, user.id, next);
  await run(
    db,
    "UPDATE invite_records SET status = 'claimed', reward_label = ? WHERE id = ?",
    [duration.typeLabel, pending.id],
  );
  await run(
    db,
    `INSERT INTO reward_records (id, user_id, created_at, code, result, reward_label, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nanoid(12), user.id, nowIso(), `INVITE-STAGE-${pending.stage}`, '邀请奖励已发放', duration.typeLabel, 'applied'],
  );

  return createAuthAction(
    env,
    user,
    currentVersion,
    duration.permanent ? '邀请奖励永久授权已发放。' : '邀请奖励已发放。',
    payload.device ?? null,
  );
};

const handleApplyRewardCode = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<ApplyRewardCodeInput & AuthRequestBody>(request);
  const code = payload.code?.trim() ?? '';
  const currentVersion = resolveCurrentVersion(payload as JsonObject);

  if (!code) {
    return error(400, '请输入奖励码。');
  }

  const current = await readLicense(db, user.id);
  const duration = parseManualCode(code);
  const next = applyDurationToLicense(
    current,
    duration,
    'reward',
    '奖励码录入',
    duration.permanent ? '奖励码升级为永久授权' : '奖励码已录入',
  );
  await saveLicense(db, user.id, next);
  await run(
    db,
    `INSERT INTO reward_records (id, user_id, created_at, code, result, reward_label, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nanoid(12), user.id, nowIso(), code.toUpperCase(), '奖励码已应用', duration.typeLabel, 'applied'],
  );

  return createAuthAction(
    env,
    user,
    currentVersion,
    duration.permanent ? '奖励码已升级为永久授权。' : '奖励码已录入。',
    payload.device ?? null,
  );
};

const handleListInviteRecords = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload: InviteRecordsResult = {
    inviteRecords: await readInviteRecords(db, user.id),
    rewardRecords: await readRewardRecords(db, user.id),
  };
  return json(payload);
};

const handleHeartbeat = async (env: Env, request: Request): Promise<Response> => {
  const db = requireDb(env);
  const { user } = await ensureSession(env, request);
  const payload = await parseBody<AuthRequestBody>(request);
  const currentVersion = resolveCurrentVersion(payload as JsonObject);
  ensureVersionAllowed(env, currentVersion);

  await ensureDevice(db, user.id, payload.device);
  const state = await buildAuthState(env, user, currentVersion, payload.device ?? null);
  const response: AuthActionResult = {
    state,
    message: '心跳校验完成。',
  };
  return json(response);
};

const handleBootstrap = async (env: Env, request: Request): Promise<Response> => {
  const payload = await parseBody<AuthRequestBody>(request).catch(() => ({} as AuthRequestBody));
  const currentVersion = resolveCurrentVersion(payload as JsonObject);
  const bootstrap: HeartbeatBootstrap = buildBootstrap(
    currentVersion,
    env.MIN_SUPPORTED_VERSION ?? null,
    asBoolean(env.MANDATORY_UPDATE, false),
    'Cloudflare Workers + D1 后端已接入，客户端可以逐步切换。',
  );
  return json(bootstrap);
};

const handleHealth = async (env: Env): Promise<Response> =>
  json({
    ok: true,
    service: 'auth-api-switcher-auth-api',
    env: env.APP_ENV ?? 'development',
    configured: Boolean(env.AUTH_DB),
    dbBinding: env.AUTH_DB ? 'ready' : 'missing',
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return json({ ok: true });
    }

    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return handleHealth(env);
      }
      if (request.method === 'POST' && url.pathname === '/api/bootstrap') {
        return handleBootstrap(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        return handleRegister(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        return handleLogin(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/auth/password-reset/request') {
        return handleRequestPasswordReset(env, request);
      }
      if (
        request.method === 'GET' &&
        (url.pathname === '/api/auth/state' || url.pathname === '/api/account/profile')
      ) {
        return handleGetProfile(env, request);
      }
      if (request.method === 'GET' && url.pathname === '/api/license/summary') {
        return handleGetLicenseSummary(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/license/activate') {
        return handleApplyActivationCode(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/invite/request') {
        return handleRequestInviteCode(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/invite/redeem') {
        return handleRedeemInviteCode(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/invite/claim') {
        return handleClaimInviteReward(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/reward/apply') {
        return handleApplyRewardCode(env, request);
      }
      if (request.method === 'GET' && url.pathname === '/api/invite/records') {
        return handleListInviteRecords(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/heartbeat') {
        return handleHeartbeat(env, request);
      }

      return error(404, `未找到路由：${request.method} ${url.pathname}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '未知错误';
      return error(500, message);
    }
  },
};
