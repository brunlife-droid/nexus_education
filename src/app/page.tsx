import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function Home() {
  return (
    <div className="bg-canvas text-text flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden
              className="bg-primary inline-flex size-7 items-center justify-center rounded-md text-[11px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-serif)", color: "var(--primary-fg)" }}
            >
              N
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Nexus Education
            </span>
          </div>
          <nav className="text-text-muted hidden gap-6 text-sm sm:flex">
            <a href="#produto" className="hover:text-text">
              Produto
            </a>
            <a href="#fundamento" className="hover:text-text">
              Fundamento
            </a>
            <Link href="/internal" className="hover:text-text">
              Design System
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
        <section className="flex flex-col items-start gap-6 py-20 sm:py-28">
          <span className="border-primary-border bg-primary-soft text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            Em construção · Fase 0
          </span>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            IA pedagógica para redes municipais de educação, com{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
              }}
            >
              white-label e auditoria
            </span>{" "}
            por padrão.
          </h1>
          <p
            className="text-text-muted max-w-2xl text-lg leading-relaxed"
            style={{ fontSize: "var(--fs-lg)" }}
          >
            Tutora IA por prefeitura (acessível pelo WhatsApp), copiloto para
            professores e dashboards estratégicos para secretarias. Mesma base,
            identidade local. Em conformidade com a LGPD desde o desenho.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/internal">
              <Button size="lg" iconRight={<ArrowRight size={16} />}>
                Ver design system
              </Button>
            </Link>
            <a href="#produto">
              <Button size="lg" variant="secondary">
                Conhecer o produto
              </Button>
            </a>
          </div>
        </section>

        <section id="produto" className="grid gap-4 py-8 sm:grid-cols-4">
          {[
            {
              title: "Aluno",
              desc: "PWA mobile + WhatsApp Business. Tutora IA com nome e voz da prefeitura.",
            },
            {
              title: "Professor",
              desc: "Copiloto de plano de aula, correção assistida, dashboards de turma.",
            },
            {
              title: "Secretaria",
              desc: "Drill-down rede → escola → turma → aluno. Relatório mensal PDF.",
            },
            {
              title: "Admin Nexus",
              desc: "Onboarding de prefeitura, observabilidade de LLMs, billing.",
            },
          ].map((c) => (
            <Card key={c.title} className="p-5">
              <div
                className="text-text-faint text-[11px] font-medium tracking-wider uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Camada
              </div>
              <h3 className="mt-1 text-base font-semibold">{c.title}</h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed">
                {c.desc}
              </p>
            </Card>
          ))}
        </section>

        <section id="fundamento" className="py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Fundamento</h2>
          <ul className="text-text-muted mt-4 grid max-w-3xl gap-3 text-sm">
            {[
              "Pedagogia socrática: tutor guia, não entrega respostas prontas.",
              "Mobile-first real: a maioria do tráfego do aluno é Android barato + WhatsApp.",
              "White-label de verdade: cor, nome do tutor, voz mudam por prefeitura.",
              "Auditabilidade default-on: cada interação sensível vira log.",
              "LGPD com menor: consentimento do responsável, anonimização, protocolo socioemocional.",
            ].map((b) => (
              <li key={b} className="flex gap-2.5">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="text-text-faint mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Nexus Education</span>
          <span>Plataforma em construção</span>
        </div>
      </footer>
    </div>
  );
}
