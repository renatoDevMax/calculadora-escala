import { Suspense } from "react";
import { EscalaSemana } from "@/components/escala-semana";
import { obterEscalaDaSemana } from "@/lib/escala-salva";

export const metadata = {
  title: "Escala",
};

async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string | string[] }>;
}) {
  const parametros = await searchParams;
  const semana = Array.isArray(parametros.semana)
    ? parametros.semana[0]
    : parametros.semana;
  const { escala, salva } = await obterEscalaDaSemana(semana);

  return <EscalaSemana escala={escala} salva={salva} />;
}

export default function EscalaPage({
  searchParams,
}: PageProps<"/escala">) {
  return (
    <div className="px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Escala</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          As três equipes têm ciclos próprios. Todo mundo da equipe passa
          pelas mesmas semanas, em ordem. Nos dias de prioridade, cada equipe
          fica com a quantidade configurada.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            Montando a escala...
          </p>
        }
      >
        <Calendario searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
