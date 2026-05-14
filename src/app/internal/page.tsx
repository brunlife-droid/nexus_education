import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  AlertTriangle,
  Sparkles,
  X,
  Tag,
  ArrowRight,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ProfBadge,
  Skeleton,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Design System · Nexus Education",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return (
    <div className="bg-canvas text-text mx-auto w-full max-w-6xl px-8 py-12">
      <header className="border-border border-b pb-8">
        <div className="text-text-faint font-mono text-[11px] tracking-widest uppercase">
          /internal · design system
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Sistema de design
        </h1>
        <p className="text-text-muted mt-2 max-w-2xl text-sm leading-relaxed">
          Tokens semânticos, tipografia, espaçamento e componentes. Mesma base
          sustenta as 4 camadas (Aluno · Professor · Secretaria · Admin) e
          múltiplos tenants (white-label por prefeitura).
        </p>
      </header>

      {/* ── Cores ── */}
      <Section title="Cores" sub="Tokens semânticos. --primary e --secondary são sobrescritos por tenant.">
        <SubSection label="Marca · tenant ativo (default: Alfenas-MG)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="--primary" value="var(--primary)" />
            <Swatch name="--primary-soft" value="var(--primary-soft)" subtle />
            <Swatch name="--secondary" value="var(--secondary)" />
            <Swatch
              name="--secondary-soft"
              value="var(--secondary-soft)"
              subtle
            />
          </div>
        </SubSection>

        <SubSection label="Semântica de feedback">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="--success" value="var(--success)" />
            <Swatch name="--warning" value="var(--warning)" />
            <Swatch name="--danger" value="var(--danger)" />
            <Swatch name="--info" value="var(--info)" />
          </div>
        </SubSection>

        <SubSection label="Proficiência pedagógica">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch
              name="--prof-advanced"
              value="var(--prof-advanced)"
              sub="≥ 85%"
            />
            <Swatch
              name="--prof-adequate"
              value="var(--prof-adequate)"
              sub="70–85%"
            />
            <Swatch
              name="--prof-basic"
              value="var(--prof-basic)"
              sub="50–70%"
            />
            <Swatch
              name="--prof-insufficient"
              value="var(--prof-insufficient)"
              sub="< 50%"
            />
          </div>
        </SubSection>

        <SubSection label="Escala de cinzas (warm)">
          <div className="grid grid-cols-11 gap-1">
            {[
              "50",
              "100",
              "200",
              "300",
              "400",
              "500",
              "600",
              "700",
              "800",
              "900",
              "950",
            ].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <div
                  className="border-border aspect-square w-full rounded border"
                  style={{ background: `var(--neutral-${s})` }}
                />
                <span className="text-text-muted font-mono text-[10px]">
                  {s}
                </span>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* ── Tipografia ── */}
      <Section
        title="Tipografia"
        sub="Inter (UI) · Source Serif 4 (institucional) · JetBrains Mono (técnico) · Atkinson Hyperlegible (a11y dislexia)"
      >
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <TypeFam
              label="Inter · UI"
              fontFamily="var(--font-sans)"
              sample="Cada aluno tem uma tutora IA"
            />
            <TypeFam
              label="Source Serif 4 · institucional"
              fontFamily="var(--font-serif)"
              sample="Relatório mensal · 2026"
            />
            <TypeFam
              label="JetBrains Mono · técnico"
              fontFamily="var(--font-mono)"
              sample="EF07MA04 · 982k tokens"
            />
          </div>
        </Card>

        <Card className="mt-4 p-6">
          <SubLabel>Escala (base 14px)</SubLabel>
          <div className="mt-3 flex flex-col gap-3">
            {[
              { label: "5xl · 48px", size: 48, weight: 600, sample: "Visão da rede" },
              { label: "4xl · 36px", size: 36, weight: 600, sample: "Olá, João." },
              { label: "3xl · 28px", size: 28, weight: 600, sample: "Onboarding de prefeitura" },
              { label: "2xl · 22px", size: 22, weight: 600, sample: "Sistema de design" },
              { label: "xl · 18px", size: 18, weight: 600, sample: "Headline de card" },
              { label: "lg · 16px", size: 16, weight: 400, sample: "Texto de leitura confortável" },
              { label: "md · 15px", size: 15, weight: 400, sample: "Texto de mensagem do tutor" },
              { label: "base · 14px", size: 14, weight: 400, sample: "Corpo geral de UI · padrão" },
              { label: "sm · 13px", size: 13, weight: 400, sample: "Botões, navegação, células" },
              { label: "xs · 12px", size: 12, weight: 400, sample: "Captions, metadata, badges" },
            ].map((t) => (
              <div
                key={t.label}
                className="border-border flex items-baseline gap-6 border-b border-dashed pb-2"
              >
                <span className="text-text-faint min-w-[110px] font-mono text-[11px]">
                  {t.label}
                </span>
                <span
                  style={{
                    fontSize: t.size,
                    fontWeight: t.weight,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t.sample}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── Componentes ── */}
      <Section title="Componentes" sub="Reutilizáveis em todas as camadas. Adaptam-se ao tenant via tokens.">
        <Card className="p-6">
          <SubLabel>Botões</SubLabel>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button>Primário</Button>
            <Button icon={<Sparkles size={14} />}>Com ícone</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={<X size={14} />}>
              Destrutivo
            </Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button variant="secondary" disabled>
              Desabilitado
            </Button>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <SubLabel>Badges</SubLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>neutro</Badge>
              <Badge tone="primary">primário</Badge>
              <Badge tone="success" icon={<Check size={10} />}>
                sucesso
              </Badge>
              <Badge tone="warning" icon={<AlertTriangle size={10} />}>
                atenção
              </Badge>
              <Badge tone="danger" icon={<AlertTriangle size={10} />}>
                erro
              </Badge>
            </div>

            <SubLabel className="mt-5">Proficiência pedagógica</SubLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <ProfBadge value="avancada" />
              <ProfBadge value="adequada" />
              <ProfBadge value="basica" />
              <ProfBadge value="insuficiente" />
            </div>

            <SubLabel className="mt-5">Chips</SubLabel>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>Matemática</Chip>
              <Chip>
                <Tag size={11} />
                EF07MA04
              </Chip>
              <Chip className="bg-primary-soft text-primary border-transparent">
                Selecionado
              </Chip>
            </div>
          </Card>

          <Card className="p-6">
            <SubLabel>Avatares</SubLabel>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name="Cláudia Resende" size={24} />
              <Avatar name="Hudson Andrade" size={32} />
              <Avatar name="Ricardo Marques" size={40} />
              <Avatar
                name="Profe Mari"
                size={48}
                bg="var(--primary)"
                color="var(--primary-fg)"
              />
              <Avatar name="João Pedro Silva" size={56} />
            </div>

            <SubLabel className="mt-5">Skeleton loading</SubLabel>
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-7" />
              <Skeleton className="h-7 opacity-80" />
              <Skeleton className="h-7 opacity-60" />
            </div>
          </Card>
        </div>

        <Card className="mt-4 p-6">
          <SubLabel>Cards de KPI (preview)</SubLabel>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Alunos ativos", value: "8.247", delta: "+12%" },
              { label: "Profs. engajados", value: "518", delta: "85%" },
              { label: "IDEB · 2025", value: "5,7", delta: "+0,3" },
              { label: "Risco · 14d", value: "1", delta: "−2" },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <div className="text-text-faint text-[11.5px] font-medium tracking-wider uppercase">
                  {k.label}
                </div>
                <div className="mt-1.5 text-[28px] leading-none font-semibold tracking-tight">
                  {k.value}
                </div>
                <div className="text-success-fg mt-1 text-xs">{k.delta}</div>
              </Card>
            ))}
          </div>
        </Card>
      </Section>

      <footer className="border-border text-text-faint mt-16 flex items-center justify-between border-t pt-6 text-xs">
        <span>
          Nexus Education · Fase 0 · próxima entrega: layout shell + auth
        </span>
        <Link href="/" className="hover:text-text inline-flex items-center gap-1">
          Voltar para o site
          <ArrowRight size={12} />
        </Link>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {sub && (
        <p className="text-text-muted mt-1.5 text-sm leading-relaxed">{sub}</p>
      )}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function SubSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <SubLabel>{label}</SubLabel>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function SubLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-text-muted text-[11.5px] font-semibold tracking-wider uppercase ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Swatch({
  name,
  value,
  sub,
  subtle,
}: {
  name: string;
  value: string;
  sub?: string;
  subtle?: boolean;
}) {
  return (
    <div className="bg-surface-2 border-border overflow-hidden rounded-md border">
      <div
        className="h-16"
        style={{
          background: value,
          borderBottom: subtle ? "1px solid var(--border)" : undefined,
        }}
      />
      <div className="p-2.5">
        <div className="text-text font-mono text-[11px]">{name}</div>
        {sub && (
          <div className="text-text-faint mt-0.5 text-[10.5px]">{sub}</div>
        )}
      </div>
    </div>
  );
}

function TypeFam({
  label,
  fontFamily,
  sample,
}: {
  label: string;
  fontFamily: string;
  sample: string;
}) {
  return (
    <div>
      <div className="text-text-faint text-[11px] font-medium tracking-wider uppercase">
        {label}
      </div>
      <div
        className="mt-2 text-[28px] font-medium tracking-tight"
        style={{ fontFamily }}
      >
        Aa
      </div>
      <div
        className="text-text-muted mt-1.5 text-sm"
        style={{ fontFamily }}
      >
        {sample}
      </div>
      <div className="text-text-faint mt-2 font-mono text-[11px]">
        400 · 500 · 600 · 700
      </div>
    </div>
  );
}
