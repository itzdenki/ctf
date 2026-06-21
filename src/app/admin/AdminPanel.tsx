'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Database, FileUp, HardDrive, KeyRound, Link2, LogOut, Save, Shield, Trash2, XCircle } from 'lucide-react';
import { BootstrapPayload, Challenge, CTFInfo, Prize, Sponsor, Team } from '../../types';

type AdminIdentity = { id: string; username: string; role: string };
type AdminTab = 'overview' | 'challenges' | 'teams' | 'event' | 'sponsors' | 'settings';
type AdminSettingsPayload = {
  admin: AdminIdentity;
  env: Array<{ key: string; configured: boolean; required: boolean }>;
  appUrl: string | null;
  ctftime: {
    enabled: boolean;
    authorizeEndpoint: string;
    tokenEndpoint: string;
    userEndpoint: string;
    scopes: string;
    callbackUrl: string | null;
    scoreboardFeedUrl: string | null;
  };
  storage: {
    challengeFilesBucketExists: boolean;
    challengeFilesBucketPrivate: boolean;
    error?: string;
  };
  firstBloodWebhook: {
    enabled: boolean;
  };
  adminAlertWebhook: {
    enabled: boolean;
  };
  database: {
    admins: number;
    teams: number;
    challenges: number;
    publishedChallenges: number;
  };
};

const emptyChallenge: Challenge = {
  id: '',
  name: '',
  description: '',
  category: 'Misc',
  points: 100,
  flag: '',
  solvedCount: 0,
  hints: [],
  isPublished: false,
};

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload;
}

export default function AdminPanel() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [login, setLogin] = useState<{ mode: 'team' | 'admin'; username: string; password: string }>({
    mode: 'team',
    username: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [state, setState] = useState<BootstrapPayload | null>(null);
  const [settings, setSettings] = useState<AdminSettingsPayload | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>(emptyChallenge);
  const [eventDraft, setEventDraft] = useState<CTFInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAdmin = async () => {
    const payload = await readJson(await fetch('/api/admin/auth/me', { cache: 'no-store', credentials: 'include' }));
    setAdmin(payload.admin);
    return payload.admin as AdminIdentity | null;
  };

  const loadState = async () => {
    const payload = await readJson(await fetch('/api/admin/bootstrap', { cache: 'no-store', credentials: 'include' }));
    setState(payload);
    setEventDraft(payload.info);
    if (!selectedChallenge.id && payload.challenges?.[0]) {
      setSelectedChallenge(payload.challenges[0]);
    }
  };

  const loadSettings = async () => {
    const payload = await readJson(await fetch('/api/admin/settings', { cache: 'no-store', credentials: 'include' }));
    setSettings(payload);
  };

  useEffect(() => {
    loadAdmin()
      .then((identity) => (identity ? loadState() : undefined))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load admin panel.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedTeams = useMemo(() => {
    return [...(state?.teams || [])].sort((a, b) => b.score - a.score);
  }, [state?.teams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const payload = await readJson(await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(login),
      }));
      setAdmin(payload.admin);
      await loadState();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
    setAdmin(null);
    setState(null);
    setSettings(null);
  };

  const runAction = async (action: () => Promise<void>, message: string) => {
    setNotice(null);
    setError(null);
    try {
      await action();
      await loadState();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setNotice(null);
    setError(null);
    if (tab === 'settings') {
      loadSettings().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load admin settings.'));
    }
  };

  const saveEvent = () => runAction(async () => {
    if (!eventDraft) return;
    await readJson(await fetch('/api/admin/event', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: eventDraft.name,
        description: eventDraft.description,
        startTime: eventDraft.startTime,
        endTime: eventDraft.endTime,
        discordUrl: eventDraft.discordUrl,
      }),
    }));
  }, 'Event config saved.');

  const saveChallenge = () => runAction(async () => {
    const method = state?.challenges.some((challenge) => challenge.id === selectedChallenge.id) ? 'PUT' : 'POST';
    const url = method === 'PUT'
      ? `/api/admin/challenges/${encodeURIComponent(selectedChallenge.id)}`
      : '/api/admin/challenges';
    await readJson(await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(selectedChallenge),
    }));
    setSelectedChallenge((challenge) => ({ ...challenge, flag: '' }));
  }, 'Challenge saved.');

  const deleteChallenge = (id: string) => runAction(async () => {
    await readJson(await fetch(`/api/admin/challenges/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    }));
    setSelectedChallenge(emptyChallenge);
  }, 'Challenge deleted.');

  const uploadAttachment = (challengeId: string, file: File) => runAction(async () => {
    const formData = new FormData();
    formData.set('file', file);
    await readJson(await fetch(`/api/admin/challenges/${encodeURIComponent(challengeId)}/attachment`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }));
  }, 'Attachment uploaded.');

  const updateTeam = (team: Team) => runAction(async () => {
    await readJson(await fetch(`/api/admin/teams/${encodeURIComponent(team.id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: team.name, email: team.email || null, status: team.status, isAdmin: Boolean(team.isAdmin) }),
    }));
  }, 'Team updated.');

  const resetSolves = (teamId: string) => runAction(async () => {
    await readJson(await fetch(`/api/admin/teams/${encodeURIComponent(teamId)}/reset-solves`, {
      method: 'POST',
      credentials: 'include',
    }));
  }, 'Team solves reset.');

  const deleteTeam = (teamId: string) => runAction(async () => {
    await readJson(await fetch(`/api/admin/teams/${encodeURIComponent(teamId)}`, {
      method: 'DELETE',
      credentials: 'include',
    }));
  }, 'Team deleted.');

  const saveSponsor = (sponsor: Sponsor & { sortOrder?: number }) => runAction(async () => {
    await readJson(await fetch('/api/admin/sponsors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(sponsor),
    }));
  }, 'Sponsor saved.');

  const savePrize = (prize: Prize) => runAction(async () => {
    await readJson(await fetch('/api/admin/prizes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(prize),
    }));
  }, 'Prize saved.');

  if (isLoading) {
    return <AdminShell><div className="text-cyan-300 font-mono">Loading admin panel...</div></AdminShell>;
  }

  if (!admin) {
    return (
      <AdminShell>
        <form onSubmit={handleLogin} className="mx-auto mt-20 max-w-sm rounded-sm border border-cyan-500/20 bg-[#080a0e] p-8">
          <div className="mb-6 text-center">
            <Shield className="mx-auto mb-3 h-9 w-9 text-cyan-400" />
            <h1 className="font-mono text-xl font-bold uppercase text-white">Admin Login</h1>
            <p className="mt-2 text-xs text-slate-400">Login with an admin team or a special admin account.</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-sm border border-cyan-500/15 bg-[#050608] p-1 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogin({ ...login, mode: 'team' })}
                className={`rounded-sm px-3 py-2 transition-colors ${
                  login.mode === 'team' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                TEAM ADMIN
              </button>
              <button
                type="button"
                onClick={() => setLogin({ ...login, mode: 'admin' })}
                className={`rounded-sm px-3 py-2 transition-colors ${
                  login.mode === 'admin' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                SPECIAL ACCOUNT
              </button>
            </div>
            <input
              value={login.username}
              onChange={(e) => setLogin({ ...login, username: e.target.value })}
              placeholder={login.mode === 'team' ? 'team name or email' : 'admin username'}
              className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400"
            />
            <input
              type="password"
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
              placeholder="password"
              className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400"
            />
            {loginError && <Status tone="error" message={loginError} />}
            <button className="w-full rounded-sm bg-cyan-500 px-4 py-2 font-mono text-sm font-bold text-black hover:bg-cyan-400">
              {login.mode === 'team' ? 'LOGIN AS TEAM ADMIN' : 'LOGIN AS SPECIAL ADMIN'}
            </button>
          </div>
        </form>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <header className="mb-6 flex flex-col gap-4 border-b border-cyan-500/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-cyan-400">Organizer Console</p>
          <h1 className="font-mono text-2xl font-bold text-white">Admin Panel</h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-sm border border-rose-500/30 px-3 py-2 font-mono text-xs font-bold text-rose-300 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          LOGOUT
        </button>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ['overview', 'Overview'],
          ['challenges', 'Challenges'],
          ['teams', 'Teams'],
          ['event', 'Event Config'],
          ['sponsors', 'Sponsors/Prizes'],
          ['settings', 'Settings'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => switchTab(id as AdminTab)}
            className={`rounded-sm border px-3 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              activeTab === id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-cyan-500/10 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && <Status tone="success" message={notice} />}
      {error && <Status tone="error" message={error} />}

      {activeTab === 'overview' && state && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Metric label="Challenges" value={state.challenges.length} />
          <Metric label="Published" value={state.challenges.filter((challenge) => challenge.isPublished).length} />
          <Metric label="Teams" value={state.teams.length} />
          <Metric label="Solves" value={state.teams.reduce((sum, team) => sum + team.solvedChallengeIds.length, 0)} />
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <Panel>
            <button
              onClick={() => setSelectedChallenge(emptyChallenge)}
              className="mb-3 w-full rounded-sm bg-cyan-500 px-3 py-2 font-mono text-xs font-bold text-black"
            >
              NEW CHALLENGE
            </button>
            <div className="space-y-2">
              {state?.challenges.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className={`w-full rounded-sm border p-3 text-left font-mono text-xs ${
                    selectedChallenge.id === challenge.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-cyan-500/10 hover:bg-white/5'
                  }`}
                >
                  <span className="block font-bold text-white">{challenge.name}</span>
                  <span className="text-slate-500">{challenge.category} / {challenge.points} pts</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <ChallengeEditor
              challenge={selectedChallenge}
              isExisting={Boolean(state?.challenges.some((challenge) => challenge.id === selectedChallenge.id))}
              onChange={setSelectedChallenge}
              onSave={saveChallenge}
              onDelete={() => selectedChallenge.id && deleteChallenge(selectedChallenge.id)}
              onUpload={(file) => selectedChallenge.id && uploadAttachment(selectedChallenge.id, file)}
            />
          </Panel>
        </div>
      )}

      {activeTab === 'teams' && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 text-center">Admin</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team) => (
                  <TeamRow key={team.id} team={team} onSave={updateTeam} onReset={resetSolves} onDelete={deleteTeam} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === 'event' && eventDraft && (
        <Panel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" value={eventDraft.name} onChange={(name) => setEventDraft({ ...eventDraft, name })} />
            <Field label="Discord URL" value={eventDraft.discordUrl} onChange={(discordUrl) => setEventDraft({ ...eventDraft, discordUrl })} />
            <Field label="Start Time ISO" value={eventDraft.startTime} onChange={(startTime) => setEventDraft({ ...eventDraft, startTime })} />
            <Field label="End Time ISO" value={eventDraft.endTime} onChange={(endTime) => setEventDraft({ ...eventDraft, endTime })} />
            <label className="md:col-span-2">
              <span className="mb-1 block font-mono text-xs uppercase text-slate-500">Description</span>
              <textarea
                value={eventDraft.description}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                rows={5}
                className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>
          <button onClick={saveEvent} className="mt-4 inline-flex items-center gap-2 rounded-sm bg-cyan-500 px-4 py-2 font-mono text-xs font-bold text-black">
            <Save className="h-4 w-4" />
            SAVE EVENT
          </button>
        </Panel>
      )}

      {activeTab === 'sponsors' && state && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Sponsors">
            <SponsorPrizeList
              items={state.info.sponsors}
              kind="sponsor"
              onSave={(item) => saveSponsor(item as Sponsor)}
              onDelete={(id) => runAction(async () => {
                await readJson(await fetch(`/api/admin/sponsors/${id}`, { method: 'DELETE', credentials: 'include' }));
              }, 'Sponsor deleted.')}
            />
          </Panel>
          <Panel title="Prizes">
            <SponsorPrizeList
              items={state.info.prizes}
              kind="prize"
              onSave={(item) => savePrize(item as Prize)}
              onDelete={(id) => runAction(async () => {
                await readJson(await fetch(`/api/admin/prizes/${id}`, { method: 'DELETE', credentials: 'include' }));
              }, 'Prize deleted.')}
            />
          </Panel>
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsView
          admin={admin}
          settings={settings}
          onRefresh={() => runAction(loadSettings, 'Settings refreshed.')}
        />
      )}
    </AdminShell>
  );
}

function SettingsView({
  admin,
  settings,
  onRefresh,
}: {
  admin: AdminIdentity;
  settings: AdminSettingsPayload | null;
  onRefresh: () => void;
}) {
  const requiredEnvReady = settings?.env.filter((item) => item.required).every((item) => item.configured) ?? false;
  const optionalEnvReady = settings?.env.filter((item) => !item.required).filter((item) => item.configured).length ?? 0;
  const requiredEnvTotal = settings?.env.filter((item) => item.required).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SettingsMetric
          icon={<Shield className="h-4 w-4" />}
          label="Admin"
          value={admin.username}
          detail={admin.role}
          tone="cyan"
        />
        <SettingsMetric
          icon={<KeyRound className="h-4 w-4" />}
          label="Required Env"
          value={settings ? `${settings.env.filter((item) => item.required && item.configured).length}/${requiredEnvTotal}` : '--'}
          detail={requiredEnvReady ? 'Ready' : 'Missing values'}
          tone={requiredEnvReady ? 'cyan' : 'rose'}
        />
        <SettingsMetric
          icon={<HardDrive className="h-4 w-4" />}
          label="Storage"
          value={settings?.storage.challengeFilesBucketExists ? 'Ready' : '--'}
          detail={settings?.storage.challengeFilesBucketPrivate ? 'Private bucket' : 'Check bucket'}
          tone={settings?.storage.challengeFilesBucketExists && settings.storage.challengeFilesBucketPrivate ? 'cyan' : 'rose'}
        />
        <SettingsMetric
          icon={<Link2 className="h-4 w-4" />}
          label="Integrations"
          value={settings ? `${Number(settings.ctftime.enabled) + Number(settings.firstBloodWebhook.enabled)}/2` : '--'}
          detail={`${optionalEnvReady} optional env set`}
          tone="cyan"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Environment Status">
          {settings ? (
            <div className="space-y-2">
              {settings.env.map((item) => (
                <StatusRow
                  key={item.key}
                  label={item.key}
                  detail={item.required ? 'Required' : 'Optional'}
                  ok={item.configured}
                  okText="Configured"
                  badText="Missing"
                />
              ))}
            </div>
          ) : (
            <SettingsLoading />
          )}
        </Panel>

        <Panel title="Database">
          {settings ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Admins" value={settings.database.admins} />
              <MiniStat label="Teams" value={settings.database.teams} />
              <MiniStat label="Challenges" value={settings.database.challenges} />
              <MiniStat label="Published" value={settings.database.publishedChallenges} />
            </div>
          ) : (
            <SettingsLoading />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="CTFtime OAuth">
          {settings ? (
            <div className="space-y-3 font-mono text-xs">
              <StatusRow label="OAuth credentials" detail="Client ID and secret" ok={settings.ctftime.enabled} okText="Enabled" badText="Missing" />
              <InfoLine label="Scoreboard feed" value={settings.ctftime.scoreboardFeedUrl || 'Set APP_URL first'} />
              <InfoLine label="Scopes" value={settings.ctftime.scopes} />
              <InfoLine label="Callback" value={settings.ctftime.callbackUrl || 'Set APP_URL first'} />
              <InfoLine label="Authorize" value={settings.ctftime.authorizeEndpoint} />
            </div>
          ) : (
            <SettingsLoading />
          )}
        </Panel>

        <Panel title="Storage">
          {settings ? (
            <div className="space-y-3 font-mono text-xs">
              <StatusRow label="challenge-files bucket" detail="Supabase Storage" ok={settings.storage.challengeFilesBucketExists} okText="Exists" badText="Missing" />
              <StatusRow label="Bucket visibility" detail="Player files use signed URLs" ok={settings.storage.challengeFilesBucketPrivate} okText="Private" badText="Public or unknown" />
              {settings.storage.error && <p className="text-rose-300">{settings.storage.error}</p>}
            </div>
          ) : (
            <SettingsLoading />
          )}
        </Panel>

        <Panel title="Discord">
          {settings ? (
            <div className="space-y-3 font-mono text-xs">
              <StatusRow label="First blood webhook" detail="DISCORD_FIRST_BLOOD_WEBHOOK_URL" ok={settings.firstBloodWebhook.enabled} okText="Enabled" badText="Disabled" />
              <StatusRow label="Admin alert webhook" detail="DISCORD_ADMIN_ALERT_WEBHOOK_URL" ok={settings.adminAlertWebhook.enabled} okText="Enabled" badText="Disabled" />
              <p className="leading-relaxed text-slate-400">
                First blood is public-facing. Admin alerts are sent to your private admin channel webhook when one IP logs into multiple teams.
              </p>
            </div>
          ) : (
            <SettingsLoading />
          )}
        </Panel>
      </div>

      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-sm border border-cyan-500/30 px-4 py-2 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Database className="h-4 w-4" />
        REFRESH SETTINGS
      </button>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070a13] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="rounded-sm border border-cyan-500/20 bg-[#080a0e] p-5">
      {title && <h2 className="mb-4 font-mono text-sm font-bold uppercase text-white">{title}</h2>}
      {children}
    </section>
  );
}

function Status({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  return (
    <div className={`mb-4 flex items-start gap-2 rounded-sm border px-3 py-2 font-mono text-xs ${
      tone === 'success' ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
    }`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase text-slate-500">{label}</span>
        <Activity className="h-4 w-4 text-cyan-400" />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold text-white">{value}</p>
    </Panel>
  );
}

function SettingsMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'cyan' | 'rose';
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase text-slate-500">{label}</span>
        <span className={tone === 'cyan' ? 'text-cyan-400' : 'text-rose-300'}>{icon}</span>
      </div>
      <p className="mt-3 truncate font-mono text-xl font-bold text-white">{value}</p>
      <p className={`mt-1 font-mono text-xs ${tone === 'cyan' ? 'text-cyan-300' : 'text-rose-300'}`}>{detail}</p>
    </Panel>
  );
}

function StatusRow({
  label,
  detail,
  ok,
  okText,
  badText,
}: {
  label: string;
  detail: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border border-cyan-500/10 bg-[#050608] px-3 py-2">
      <div className="min-w-0 font-mono">
        <span className="block truncate text-xs font-bold text-white">{label}</span>
        <span className="block truncate text-[10px] text-slate-500">{detail}</span>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] font-bold ${
        ok ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      }`}>
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {ok ? okText : badText}
      </span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="block text-[10px] uppercase text-slate-500">{label}</span>
      <span className="block break-all rounded-sm border border-cyan-500/10 bg-[#050608] px-3 py-2 text-cyan-200">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-cyan-500/10 bg-[#050608] p-4">
      <span className="font-mono text-[10px] uppercase text-slate-500">{label}</span>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SettingsLoading() {
  return <div className="font-mono text-xs text-cyan-300">Loading settings...</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block font-mono text-xs uppercase text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function ChallengeEditor({
  challenge,
  isExisting,
  onChange,
  onSave,
  onDelete,
  onUpload,
}: {
  challenge: Challenge;
  isExisting: boolean;
  onChange: (challenge: Challenge) => void;
  onSave: () => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="ID" value={challenge.id} onChange={(id) => onChange({ ...challenge, id })} />
        <Field label="Name" value={challenge.name} onChange={(name) => onChange({ ...challenge, name })} />
        <Field label="Category" value={challenge.category} onChange={(category) => onChange({ ...challenge, category })} />
        <Field label="Points" value={String(challenge.points)} onChange={(points) => onChange({ ...challenge, points: Number(points) || 0 })} />
        <Field label={isExisting ? 'New Flag (leave blank to keep hash)' : 'Flag'} value={challenge.flag || ''} onChange={(flag) => onChange({ ...challenge, flag })} />
        <Field label="Connection Link" value={challenge.connectionLink || ''} onChange={(connectionLink) => onChange({ ...challenge, connectionLink })} />
      </div>
      <p className="font-mono text-xs text-slate-500">
        Flags are write-only. The server stores only a SHA-256 hash and never returns the raw flag.
      </p>
      <label className="block">
        <span className="mb-1 block font-mono text-xs uppercase text-slate-500">Description</span>
        <textarea
          value={challenge.description}
          onChange={(e) => onChange({ ...challenge, description: e.target.value })}
          rows={6}
          className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-mono text-xs uppercase text-slate-500">Hints, one per line</span>
        <textarea
          value={(challenge.hints || []).join('\n')}
          onChange={(e) => onChange({ ...challenge, hints: e.target.value.split('\n').map((hint) => hint.trim()).filter(Boolean) })}
          rows={4}
          className="w-full rounded-sm border border-cyan-500/20 bg-[#050608] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="inline-flex items-center gap-2 font-mono text-xs text-slate-300">
        <input
          type="checkbox"
          checked={Boolean(challenge.isPublished)}
          onChange={(e) => onChange({ ...challenge, isPublished: e.target.checked })}
        />
        Published
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onSave} className="inline-flex items-center gap-2 rounded-sm bg-cyan-500 px-4 py-2 font-mono text-xs font-bold text-black">
          <Save className="h-4 w-4" />
          SAVE
        </button>
        {challenge.id && (
          <>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-cyan-500/30 px-4 py-2 font-mono text-xs font-bold text-cyan-300">
              <FileUp className="h-4 w-4" />
              UPLOAD FILE
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
            <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-sm border border-rose-500/30 px-4 py-2 font-mono text-xs font-bold text-rose-300">
              <Trash2 className="h-4 w-4" />
              DELETE
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, onSave, onReset, onDelete }: {
  team: Team;
  onSave: (team: Team) => void;
  onReset: (teamId: string) => void;
  onDelete: (teamId: string) => void;
}) {
  const [draft, setDraft] = useState(team);
  return (
    <tr className="border-t border-cyan-500/10">
      <td className="px-3 py-2">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-44 rounded-sm bg-[#050608] px-2 py-1 text-white" />
      </td>
      <td className="px-3 py-2">
        <input value={draft.email || ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="w-52 rounded-sm bg-[#050608] px-2 py-1 text-white" />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={Boolean(draft.isAdmin)}
          onChange={(e) => setDraft({ ...draft, isAdmin: e.target.checked })}
          className="h-4 w-4 accent-cyan-500"
        />
      </td>
      <td className="px-3 py-2">
        <select value={draft.status || 'active'} onChange={(e) => setDraft({ ...draft, status: e.target.value as Team['status'] })} className="rounded-sm bg-[#050608] px-2 py-1 text-white">
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="banned">banned</option>
        </select>
      </td>
      <td className="px-3 py-2 text-cyan-300">{team.score}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button onClick={() => onSave(draft)} className="rounded-sm border border-cyan-500/30 px-2 py-1 text-cyan-300">Save</button>
          <button onClick={() => onReset(team.id)} className="rounded-sm border border-amber-500/30 px-2 py-1 text-amber-300">Reset</button>
          <button onClick={() => onDelete(team.id)} className="rounded-sm border border-rose-500/30 px-2 py-1 text-rose-300">Delete</button>
        </div>
      </td>
    </tr>
  );
}

function SponsorPrizeList({
  items,
  kind,
  onSave,
  onDelete,
}: {
  items: Array<(Sponsor | Prize) & { sortOrder?: number }>;
  kind: 'sponsor' | 'prize';
  onSave: (item: any) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<any>(kind === 'sponsor'
    ? { name: '', linkUrl: '', description: '', tier: 'Gold', sortOrder: 0 }
    : { place: '', reward: '', icon: 'Trophy', sortOrder: 0 });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between rounded-sm border border-cyan-500/10 p-3 font-mono text-xs">
            <span className="text-white">{item.name || item.place}</span>
            <button onClick={() => item.id && onDelete(item.id)} className="text-rose-300">Delete</button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {kind === 'sponsor' ? (
          <>
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="Link URL" value={draft.linkUrl} onChange={(linkUrl) => setDraft({ ...draft, linkUrl })} />
            <Field label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
            <Field label="Tier" value={draft.tier} onChange={(tier) => setDraft({ ...draft, tier })} />
          </>
        ) : (
          <>
            <Field label="Place" value={draft.place} onChange={(place) => setDraft({ ...draft, place })} />
            <Field label="Reward" value={draft.reward} onChange={(reward) => setDraft({ ...draft, reward })} />
            <Field label="Icon" value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
          </>
        )}
        <button onClick={() => onSave(draft)} className="rounded-sm bg-cyan-500 px-4 py-2 font-mono text-xs font-bold text-black">
          ADD / SAVE
        </button>
      </div>
    </div>
  );
}
