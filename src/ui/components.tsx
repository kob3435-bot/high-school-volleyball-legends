import type { ComponentChildren } from 'preact';
import type { PlayerDef } from '../engine/types';
import { t, type Lang } from './i18n/strings';
import { save } from '../engine/SaveEngine';

export function Shell({ children, title, subtitle, onBack }: {
  children: ComponentChildren; title?: string; subtitle?: string; onBack?: () => void;
}) {
  const lang = (save.getSettings().language || 'en') as Lang;
  return (
    <div class="screen">
      <div class="row between wrap gap" style={{ marginBottom: 12 }}>
        <div>
          {title && <h1 class="title">{title}</h1>}
          {subtitle && <p class="subtitle">{subtitle}</p>}
        </div>
        {onBack && <button class="btn ghost" onClick={onBack} data-testid="back">{t(lang, 'back')}</button>}
      </div>
      {children}
    </div>
  );
}

export function PlayerCard({ p, selected, onClick }: { p: PlayerDef; selected?: boolean; onClick?: () => void }) {
  return (
    <div class={`player-card ${selected ? 'selected' : ''}`} onClick={onClick} data-testid={`player-${p.id}`}>
      <div class="ovr">{p.overall}</div>
      <div class="name">{p.name}</div>
      <div class="meta">
        <span class={`pos-tag ${p.pos}`}>{p.pos}</span>
        {p.heightCm}cm · {p.archetype}
      </div>
      {p.signatures.length > 0 && (
        <div class="meta" style={{ marginTop: 4, color: 'var(--accent2)' }}>{p.signatures[0].replace(/_/g, ' ')}</div>
      )}
    </div>
  );
}

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div class="row between"><span class="muted" style={{ fontSize: '.78rem' }}>{label}</span><span style={{ fontSize: '.78rem' }}>{value}</span></div>
      <div style={{ height: 6, background: '#244', borderRadius: 4 }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 4, background: value >= 90 ? 'var(--accent2)' : value >= 75 ? 'var(--good)' : 'var(--accent)' }} />
      </div>
    </div>
  );
}
