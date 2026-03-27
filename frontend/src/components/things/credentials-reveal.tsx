'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { thingsService } from '@/services/things.service';

interface CredentialsRevealProps {
  thingId: string;
}

export function CredentialsReveal({ thingId }: CredentialsRevealProps) {
  const t = useTranslations('Credentials');
  const { toast } = useToast();
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string; notes: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      setCredentials(null);
      return;
    }
    setLoading(true);
    try {
      const creds = await thingsService.getCredentials(thingId);
      setCredentials(creds);
      setRevealed(true);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('fetchError'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'error' });
    }
  };

  const CopyButton = ({ text, field, label }: { text: string; field: string; label: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      aria-label={label}
    >
      {copied === field ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('title')}</h3>
        <Button size="sm" variant="ghost" onClick={handleReveal} loading={loading}>
          {revealed ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {revealed ? t('hide') : t('reveal')}
        </Button>
      </div>
      {revealed && credentials ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('username')}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.username || '-'}</span>
              {credentials.username && (
                <CopyButton text={credentials.username} field="username" label={t('copyUsername')} />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('password')}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.password ? '••••••••' : '-'}</span>
              {credentials.password && (
                <CopyButton text={credentials.password} field="password" label={t('copyPassword')} />
              )}
            </div>
          </div>
          {credentials.notes && (
            <div>
              <span className="text-muted-foreground">{t('notes')}</span>
              <p className="mt-1">{credentials.notes}</p>
            </div>
          )}
        </div>
      ) : !revealed ? (
        <p className="text-sm text-muted-foreground">{t('clickReveal')}</p>
      ) : null}
    </div>
  );
}
