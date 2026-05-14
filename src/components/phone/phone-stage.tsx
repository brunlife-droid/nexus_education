interface PhoneStageProps {
  label?: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Container desktop que apresenta phones lado a lado com um
 * cabeçalho explicando a tela. Usado nas rotas /aluno/*.
 */
export function PhoneStage({ label, description, children }: PhoneStageProps) {
  return (
    <div className="px-8 py-6">
      {(label || description) && (
        <div className="mb-5">
          {label && (
            <div
              className="text-text-muted text-[13px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {label}
            </div>
          )}
          {description && (
            <div className="text-text-faint mt-0.5 max-w-2xl text-[13px]">
              {description}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-8">{children}</div>
    </div>
  );
}
