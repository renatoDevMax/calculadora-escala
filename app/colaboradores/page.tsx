import { Suspense } from "react";
import { ColaboradoresPainel } from "@/components/colaboradores-painel";
import { listarColaboradores } from "@/lib/colaboradores";

export const metadata = {
  title: "Colaboradores",
};

async function Lista() {
  const colaboradores = await listarColaboradores();
  return <ColaboradoresPainel colaboradores={colaboradores} />;
}

export default function ColaboradoresPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
        <p className="mt-1 text-sm text-muted">
          Pessoas que entram na escala, separadas por equipe.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            Carregando colaboradores...
          </p>
        }
      >
        <Lista />
      </Suspense>
    </div>
  );
}
