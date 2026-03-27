'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CredentialsRevealProps {
  credentials: { username: string; password: string; notes: string };
}

export function CredentialsReveal({ credentials }: CredentialsRevealProps) {
  const t = useTranslations('Credentials');
  const [revealed, setRevealed] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('title')}</h3>
        <Button size="sm" variant="ghost" onClick={() => setRevealed(!revealed)}>
          {revealed ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {revealed ? t('hide') : t('reveal')}
        </Button>
      </div>
      {revealed ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('username')}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.username || '-'}</span>
              {credentials.username && (
                <button
                  onClick={() => copyToClipboard(credentials.username)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label={t('copyUsername')}
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('password')}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.password || '-'}</span>
              {credentials.password && (
                <button
                  onClick={() => copyToClipboard(credentials.password)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label={t('copyPassword')}
                >
                  <Copy className="h-3 w-3" />
                </button>
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
      ) : (
        <p className="text-sm text-muted-foreground">{t('clickReveal')}</p>
      )}
    </div>
  );
}
