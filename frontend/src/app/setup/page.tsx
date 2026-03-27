'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Radar, ArrowRight, ArrowLeft, Check, Upload, Plus } from 'lucide-react';

const LANGUAGES = [
  { value: 'pt-BR', label: 'Portugues (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
];

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'UTC', label: 'UTC' },
];

type SetupMode = 'fresh' | 'restore' | null;

export default function SetupPage() {
  const router = useRouter();
  const t = useTranslations('Setup');
  const tc = useTranslations('Common');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Instance config
  const [language, setLanguage] = useState('pt-BR');
  const [instanceName, setInstanceName] = useState('IoT Sentinel');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  // Step 2: Mode choice
  const [mode, setMode] = useState<SetupMode>(null);

  // Step 3 (fresh): Admin credentials
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3 (restore): Backup file + password
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    document.cookie = `locale=${newLang};path=/;max-age=31536000`;
    router.refresh();
  };

  const totalSteps = mode === 'restore' ? 3 : 4;
  const displayStep = step;

  const handleComplete = async () => {
    if (adminPassword !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.completeSetup({
        language,
        instanceName,
        timezone,
        adminUsername,
        adminPassword,
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!backupFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', backupFile);
      formData.append('password', backupPassword);

      const res = await fetch('/api/v1/setup/restore', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Restore failed' }));
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      const result = await res.json();
      const counts = Object.entries(result.imported).map(([k, v]) => `${k}: ${v}`).join(', ');
      setRestoreResult(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Radar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">{t('welcome')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('stepOf', { step: displayStep, total: totalSteps })}
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-12 rounded-full ${i < displayStep ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Instance Settings */}
        {step === 1 && (
          <div className="space-y-4">
            <Select
              id="language"
              label={t('language')}
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              options={LANGUAGES}
            />
            <Input
              id="instanceName"
              label={t('instanceName')}
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder={t('instanceNamePlaceholder')}
            />
            <Select
              id="timezone"
              label={t('timezone')}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={TIMEZONES}
            />
            <Button className="w-full" onClick={() => setStep(2)}>
              {tc('next')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Choose mode */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">{t('howToStart')}</h2>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => { setMode('fresh'); setStep(3); }}
                className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors hover:border-primary ${
                  mode === 'fresh' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('startFresh')}</p>
                  <p className="text-sm text-muted-foreground">{t('startFreshDesc')}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setMode('restore'); setStep(3); }}
                className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors hover:border-primary ${
                  mode === 'restore' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('restoreBackup')}</p>
                  <p className="text-sm text-muted-foreground">{t('restoreBackupDesc')}</p>
                </div>
              </button>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
            </Button>
          </div>
        )}

        {/* Step 3 (fresh): Admin credentials */}
        {step === 3 && mode === 'fresh' && (
          <div className="space-y-4">
            <Input
              id="adminUsername"
              label={t('adminUsername')}
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder={t('adminUsernamePlaceholder')}
            />
            <Input
              id="adminPassword"
              label={t('password')}
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
            />
            <Input
              id="confirmPassword"
              label={t('confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(4)}
                disabled={!adminUsername || adminPassword.length < 6 || adminPassword !== confirmPassword}
              >
                {tc('next')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 (restore): Upload backup */}
        {step === 3 && mode === 'restore' && !restoreResult && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('restoreFrom')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('restoreUploadDesc')}
            </p>
            <div>
              <label htmlFor="backup-file" className="block text-sm font-medium mb-1">{t('backupFile')}</label>
              <input
                id="backup-file"
                type="file"
                accept=".gz,.json.gz"
                onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
            <Input
              id="backup-password"
              label={t('backupPassword')}
              type="password"
              placeholder={t('backupPasswordPlaceholder')}
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setStep(2); setError(''); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleRestore}
                disabled={loading || !backupFile || !backupPassword}
              >
                {loading ? t('restoring') : <><Upload className="mr-2 h-4 w-4" /> {t('restore')}</>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 (restore): Success */}
        {step === 3 && mode === 'restore' && restoreResult && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto mb-3">
                <Check className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-lg font-semibold">{t('restoreComplete')}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {t('restoreSuccess', { details: restoreResult })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('loginRedirect')}
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push('/login')}>
              {t('goToLogin')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 4 (fresh): Review */}
        {step === 4 && mode === 'fresh' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('review')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('reviewLanguage')}</span>
                <span>{LANGUAGES.find((l) => l.value === language)?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('reviewInstance')}</span>
                <span>{instanceName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('reviewTimezone')}</span>
                <span>{timezone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t('reviewAdmin')}</span>
                <span>{adminUsername}</span>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {tc('back')}
              </Button>
              <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                {loading ? t('settingUp') : <><Check className="mr-2 h-4 w-4" /> {t('complete')}</>}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
