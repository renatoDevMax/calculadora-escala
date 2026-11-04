import Link from "next/link";
import { RecalcularEscala } from "@/components/recalcular-escala";
import { SalvarEscala } from "@/components/salvar-escala";
import type { Equipe } from "@/lib/colaboradores";
import type { EscalaSemana } from "@/lib/escala";

const EQUIPE_TRABALHO: Record<Equipe, string> = {
  "1": "bg-equipe-1 text-equipe-1-ink",
  "2": "bg-equipe-2 text-equipe-2-ink",
  "3": "bg-equipe-3 text-equipe-3-ink",
};

const EQUIPE_MARCA: Record<Equipe, string> = {
  "1": "bg-equipe-1-ink",
  "2": "bg-equipe-2-ink",
  "3": "bg-equipe-3-ink",
};

function textoFolgas(quantidade: number) {
  if (quantidade === 1) {
    return "1 folga na semana";
  }

  return `${quantidade} folgas na semana`;
}

function juntarDias(dias: string[]) {
  if (dias.length === 0) {
    return "nenhum dia marcado";
  }

  if (dias.length === 1) {
    return dias[0];
  }

  return `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}`;
}

export function EscalaSemana({
  escala,
  salva,
}: {
  escala: EscalaSemana;
  salva: boolean;
}) {
  const prioridade = juntarDias(escala.diasPrioridade);
  const modo = escala.sequencial
    ? "As folgas de cada pessoa ficam em dias seguidos."
    : "As folgas de cada pessoa não ficam em dias seguidos.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted">Semana</p>
          <h2 className="text-xl font-semibold tracking-tight">{escala.titulo}</h2>
          <p className="mt-1 text-sm text-muted">
            {textoFolgas(escala.numeroFolgas)}. {modo} Prioridade: {prioridade}.
            {escala.diasPrioridade.length > 0
              ? ` Nos dias de prioridade, ${escala.numFolgasPrioridade} ${
                  escala.numFolgasPrioridade === 1
                    ? "pessoa folga em cada equipe"
                    : "pessoas folgam em cada equipe"
                }.`
              : ""}
            {escala.ciclos.length > 0
              ? " Cada equipe tem o próprio ciclo. Na próxima semana, cada pessoa assume a folga da linha de baixo da sua equipe."
              : ""}
            {salva
              ? " Esta é a escala salva."
              : " Esta escala ainda não foi salva."}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <RecalcularEscala />
          <SalvarEscala />
          <a
            href={`/api/escala/planilha?semana=${escala.inicio}`}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
          >
            Exportar Planilha
          </a>
          <Link
            href={`/escala?semana=${escala.anterior}`}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
          >
            Semana anterior
          </Link>
          {escala.semanaAtual ? null : (
            <Link
              href="/escala"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
            >
              Esta semana
            </Link>
          )}
          <Link
            href={`/escala?semana=${escala.proxima}`}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
          >
            Próxima semana
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {(["1", "2", "3"] as Equipe[]).map((equipe) => {
          const ciclo = escala.ciclos.find((item) => item.equipe === equipe);

          return (
            <span key={equipe} className="inline-flex items-center gap-2">
              <span className={`size-3 rounded-full ${EQUIPE_MARCA[equipe]}`} />
              Equipe {equipe}
              {ciclo ? ` · semana ${ciclo.semana} de ${ciclo.tamanho}` : ""}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-2 text-muted">
          <span className="size-3 rounded-full border border-line bg-field" />
          Folga
        </span>
      </div>

      {escala.linhas.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
          Cadastre colaboradores para montar a escala.
        </p>
      ) : (
        <div className="max-h-[calc(100vh-12rem)] overflow-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-panel">
              <tr>
                <th className="sticky left-0 z-30 border-r border-b border-line bg-panel px-4 py-3 text-left font-medium">
                  Funcionário
                </th>
                {escala.dias.map((dia) => (
                  <th
                    key={dia.iso}
                    className={`border-b border-line px-2 py-3 text-center font-medium ${
                      dia.hoje ? "bg-field" : ""
                    }`}
                  >
                    <span className="block">{dia.nome}</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {dia.rotulo}
                      {dia.hoje ? " · hoje" : ""}
                    </span>
                    {dia.prioridade ? (
                      <span className="mt-1 block text-xs font-medium text-ink">
                        Prioridade · {escala.numFolgasPrioridade} por equipe
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs font-normal text-muted">
                      {escala.folgasNoDia[dia.indice]} no total
                    </span>
                    <span className="block text-xs font-normal text-muted">
                      equipes {escala.folgasPorEquipe["1"][dia.indice]} ·{" "}
                      {escala.folgasPorEquipe["2"][dia.indice]} ·{" "}
                      {escala.folgasPorEquipe["3"][dia.indice]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escala.linhas.map((linha, indice) => {
                const mudaEquipe =
                  indice === 0 ||
                  escala.linhas[indice - 1].equipe !== linha.equipe;

                return (
                  <tr key={linha.id}>
                    <th
                      className={`sticky left-0 z-10 border-r border-b border-line bg-panel px-4 py-2.5 text-left font-medium ${
                        mudaEquipe && indice > 0 ? "border-t-2" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${EQUIPE_MARCA[linha.equipe]}`}
                        />
                        <span>
                          {linha.nome}
                          <span className="mt-0.5 block text-xs font-normal text-muted">
                            Equipe {linha.equipe} · semana {linha.posicaoCiclo} do
                            ciclo
                          </span>
                        </span>
                      </span>
                    </th>
                    {linha.folgas.map((folga, dia) => (
                      <td
                        key={`${linha.id}-${dia}`}
                        data-dia={dia}
                        data-folga={folga ? "1" : "0"}
                        data-equipe={linha.equipe}
                        className={`border-b border-line px-2 py-2.5 text-center text-xs ${
                          mudaEquipe && indice > 0 ? "border-t-2" : ""
                        } ${
                          folga
                            ? "bg-field text-muted"
                            : EQUIPE_TRABALHO[linha.equipe]
                        } ${escala.dias[dia].hoje ? "outline outline-1 outline-ink/30" : ""}`}
                      >
                        {folga ? "Folga" : "Trabalho"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
