import { Suspense } from "react";
import { EscalaMes } from "@/components/escala-mes";
import { obterVistaEscala } from "@/lib/vista-escala";

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
  const vista = await obterVistaEscala(semana, { comTrocas: true });

  return <EscalaMes key={vista.grade.inicio} vista={vista} />;
}

export default function EscalaPage({ searchParams }: PageProps<"/escala">) {
  return (
    <div className="px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Escala</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A folga fixa e a folga alternada de cada pessoa, no mês inteiro.
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
