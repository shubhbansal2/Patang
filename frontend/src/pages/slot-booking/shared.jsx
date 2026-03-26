import { AlertTriangle, Info, LoaderCircle } from 'lucide-react';
import { getSubscriptionStatusTone } from './utils';

const badgeToneClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const bannerToneClasses = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

export const SectionHeading = ({ eyebrow, title, description, actions = null }) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-bold text-gray-800">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>}
    </div>
    {actions}
  </div>
);

export const StatusBadge = ({ status, tone }) => {
  const resolvedTone = tone || getSubscriptionStatusTone(status);

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeToneClasses[resolvedTone] || badgeToneClasses.info}`}>
      {status}
    </span>
  );
};

export const InlineBanner = ({ title, description, tone = 'info', icon: Icon = Info }) => (
  <div className={`rounded-2xl border px-4 py-3 ${bannerToneClasses[tone] || bannerToneClasses.info}`}>
    <div className="flex items-start gap-3">
      <Icon size={18} className="mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
      </div>
    </div>
  </div>
);

export const RulesCard = ({ title, rules = [], accent = 'warning' }) => {
  const tones = {
    warning: 'border-amber-200 bg-amber-50/70',
    info: 'border-blue-200 bg-blue-50/70',
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[accent] || tones.warning}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      {rules.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          {rules.map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-current opacity-60" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-500">No rules available.</p>
      )}
    </div>
  );
};

export const LoadingState = ({ label = 'Loading...' }) => (
  <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-gray-100 bg-white p-10 shadow-sm">
    <div className="flex flex-col items-center gap-3 text-center">
      <LoaderCircle size={28} className="animate-spin text-brand-500" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export const ErrorState = ({ message, onRetry, retryLabel = 'Try again' }) => (
  <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
    <div className="flex flex-col items-start gap-3 text-left">
      <div className="rounded-2xl bg-red-50 p-3 text-red-600">
        <AlertTriangle size={20} />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">Could not load this section</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {retryLabel}
        </button>
      )}
    </div>
  </div>
);

export const EmptyState = ({ title, description }) => (
  <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
    <h3 className="text-base font-bold text-gray-800">{title}</h3>
    <p className="mt-2 text-sm text-gray-500">{description}</p>
  </div>
);
