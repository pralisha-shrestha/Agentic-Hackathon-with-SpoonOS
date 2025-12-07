import React from 'react';
import type { ContractSpec, Visibility } from '../types';
import PythonLogo from '../assets/python.svg';
import CSharpLogo from '../assets/csharp.svg';

interface FormattedContractSpecProps {
  spec: ContractSpec;
}

const visibilityStyle: Record<Visibility, string> = {
  public: 'border-primary/40 bg-primary/10 text-primary',
  private: 'border-destructive/40 bg-destructive/10 text-destructive',
  admin: 'border-[#B8A082]/40 bg-[#B8A082]/10 text-[#B8A082]',
};

const languageBadge = (language: string) => {
  const lower = language?.toLowerCase() || '';
  const isPython = lower === 'python';
  const isCSharp = lower === 'csharp' || lower === 'c#';
  const label = isPython ? 'Python' : isCSharp ? 'C#' : language;

  const fallbackDot = (
    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" />
  );

  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-card text-sm font-semibold">
      {isPython ? (
        <img src={PythonLogo} alt="Python" className="w-4 h-4" />
      ) : isCSharp ? (
        <img src={CSharpLogo} alt="C#" className="w-4 h-4" />
      ) : (
        fallbackDot
      )}
      <span className="text-foreground">{label}</span>
    </span>
  );
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const Section: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <div className="flex flex-col gap-2">
    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
      {title}{typeof count === 'number' ? ` (${count})` : ''}
    </div>
    <div className="pl-2 space-y-2">{children}</div>
  </div>
);

const bulletItem = (content: React.ReactNode, key?: React.Key) => (
  <div className="flex items-start gap-2" key={key}>
    <span className="text-muted-foreground select-none">•</span>
    <div className="space-y-0.5">{content}</div>
  </div>
);

const FormattedContractSpec: React.FC<FormattedContractSpecProps> = ({ spec }) => {
  // Console log the full output as requested
  console.log('Full Contract Spec:', JSON.stringify(spec, null, 2));

  return (
    <div className="flex flex-col gap-5">
      {/* Title block */}
      <div className="space-y-1">
        <div className="text-lg md:text-xl font-semibold text-foreground">{spec.metadata.name}</div>
        {spec.metadata.description && (
          <div className="text-sm text-muted-foreground leading-relaxed">
            {spec.metadata.description}
          </div>
        )}
      </div>
      <div className="border-t border-border" />

      {/* Extra metadata (symbol, shortName) */}
      {(spec.metadata.symbol || spec.metadata.shortName) && (
        <>
          <Section title="Details">
            {spec.metadata.symbol && bulletItem(
              <>
                <span className="font-semibold text-sm text-foreground">Symbol</span>
                <div className="text-xs text-muted-foreground">{spec.metadata.symbol}</div>
              </>
            )}
            {spec.metadata.shortName && bulletItem(
              <>
                <span className="font-semibold text-sm text-foreground">Short Name</span>
                <div className="text-xs text-muted-foreground">{spec.metadata.shortName}</div>
              </>
            )}
          </Section>
          <div className="border-t border-border" />
        </>
      )}

      {/* Variables */}
      {spec.variables.length > 0 && (
        <Section title="Variables" count={spec.variables.length}>
          {spec.variables.map(variable =>
            bulletItem(
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-sm text-foreground break-words">{variable.name}</span>
                  <span className="text-xs text-muted-foreground break-all break-words">{variable.type}{variable.initialValue !== undefined ? ` = ${formatValue(variable.initialValue)}` : ''}</span>
                </div>
                {variable.description && (
                  <div className="text-xs text-muted-foreground">— {variable.description}</div>
                )}
              </>,
              variable.id
            )
          )}
        </Section>
      )}
      {spec.variables.length > 0 && <div className="border-t border-border" />}

      {/* Methods */}
      {spec.methods.length > 0 && (
        <Section title="Methods" count={spec.methods.length}>
          {spec.methods.map(method =>
            bulletItem(
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{method.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${visibilityStyle[method.visibility]}`}>
                    {method.visibility}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground break-words break-all">
                  ({method.params.map(p => `${p.name}: ${p.type}`).join(', ') || '()'}){method.returns && ` → ${method.returns}`}
                </div>
                {method.description && (
                  <div className="text-xs text-muted-foreground">— {method.description}</div>
                )}
              </>,
              method.id
            )
          )}
        </Section>
      )}
      {spec.methods.length > 0 && <div className="border-t border-border" />}

      {/* Events */}
      {spec.events.length > 0 && (
        <Section title="Events" count={spec.events.length}>
          {spec.events.map(event =>
            bulletItem(
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-sm text-foreground break-words">{event.name}</span>
                  <span className="text-xs text-muted-foreground break-words break-all">
                    ({event.params.map(p => `${p.name}: ${p.type}`).join(', ')})
                  </span>
                </div>
                {event.description && (
                  <div className="text-xs text-muted-foreground">— {event.description}</div>
                )}
              </div>,
              event.id
            )
          )}
        </Section>
      )}
      {spec.events.length > 0 && <div className="border-t border-border" />}

      {/* Permissions */}
      {spec.permissions.length > 0 && (
        <Section title="Permissions" count={spec.permissions.length}>
          {spec.permissions.map(permission =>
            bulletItem(
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm text-foreground">
                  {permission.name || permission.role}
                </span>
                {permission.description && (
                  <div className="text-xs text-muted-foreground">— {permission.description}</div>
                )}
                {permission.methods && permission.methods.length > 0 && (
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                    <span className="font-semibold text-foreground">Methods:</span>
                    <span>{permission.methods.join(', ')}</span>
                  </div>
                )}
              </div>,
              permission.id
            )
          )}
        </Section>
      )}
      {spec.permissions.length > 0 && <div className="border-t border-border" />}

      {/* Language */}
      <Section title="Stack">
        <div className="-ml-2 inline-flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card/60">
          <span className="text-sm text-foreground font-semibold">Language</span>
          {languageBadge(spec.language)}
        </div>
      </Section>
    </div>
  );
};

export default FormattedContractSpec;

