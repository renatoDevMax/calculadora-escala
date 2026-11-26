import Link from "next/link";
import { GradeMensal, NavegacaoMes } from "@/components/grade-mensal";
import { tituloDoMes, type obterVistaEscala } from "@/lib/vista-escala";

type Vista = Awaited<ReturnType<typeof obterVistaEscala>>;

export function EscalaMes({ vista }: { vista: Vista }) {
  const { grade, meses, plano } = vista;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/gerar-escala?semana=${grade.inicio}`}
          className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90"
        >
          Gerar Escala
        </Link>
        <a
          href={`/api/escala/planilha?semana=${grade.inicio}`}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
        >
          Exportar Planilha
        </a>
      </div>

      {plano ? (
        <GradeMensal
          plano={plano}
          anterior={meses.anterior}
          proximo={meses.proximo}
          rota="/escala"
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Mês</p>
            <NavegacaoMes
              titulo={tituloDoMes(grade.inicio)}
              anterior={meses.anterior}
              proximo={meses.proximo}
              rota="/escala"
            />
          </div>
          <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            Gere a escala para montar o mês.
          </p>
        </div>
      )}
    </div>
  );
}
