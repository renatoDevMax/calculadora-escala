import { Suspense } from "react";
import { GradeTrabalho } from "@/components/grade-trabalho";
import { obterVistaEscala } from "@/lib/vista-escala";

export const metadata = {
  title: "Gerar Escala",
};

async function Grade({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string | string[] }>;
}) {
  const parametros = await searchParams;
  const semana = Array.isArray(parametros.semana)
    ? parametros.semana[0]
    : parametros.semana;
  const vista = await obterVistaEscala(semana);

  return (
    <GradeTrabalho
      key={vista.grade.inicio}
      grade={vista.grade}
      limitePrioridade={vista.limitePrioridade}
      marcacoesIniciais={vista.marcacoes}
      planoInicial={vista.plano}
      avisoInicial={vista.aviso}
      meses={vista.meses}
    />
  );
}

export default function GerarEscalaPage({
  searchParams,
}: PageProps<"/gerar-escala">) {
  return (
    <div className="px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Gerar Escala</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A semana abre com todos trabalhando. Clique num dia para marcar a
          folga.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            Montando a escala...
          </p>
        }
      >
        <Grade searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
