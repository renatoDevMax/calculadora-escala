import Link from "next/link";
import type { Equipe } from "@/lib/colaboradores";
import type { PlanoMensal } from "@/lib/plano-mensal";

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

export function NavegacaoMes({
  titulo,
  anterior,
  proximo,
  rota = "/gerar-escala",
}: {
  titulo: string;
  anterior: string;
  proximo: string;
  rota?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`${rota}?semana=${anterior}#plano-mensal`}
        aria-label="Mês anterior"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-panel text-lg leading-none hover:bg-field"
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
      <Link
        href={`${rota}?semana=${proximo}#plano-mensal`}
        aria-label="Próximo mês"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-panel text-lg leading-none hover:bg-field"
      >
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}

export function GradeMensal({
  plano,
  anterior,
  proximo,
  rota = "/gerar-escala",
}: {
  plano: PlanoMensal;
  anterior: string;
  proximo: string;
  rota?: string;
}) {
  return (
    <section id="plano-mensal" className="space-y-4" data-limite={plano.limitePrioridade}>
      <div>
        <p className="text-sm text-muted">Mês</p>
        <NavegacaoMes titulo={plano.titulo} anterior={anterior} proximo={proximo} rota={rota} />
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A folga fixa se repete em todo o dia marcado. A folga alternada reveza
          com o domingo da mesma semana. Em quatro semanas, o homem folga num
          domingo e a mulher num domingo sim, no outro não. Cada semana tem no
          máximo duas folgas.
        </p>
      </div>

      {plano.linhas.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
          Cadastre colaboradores para montar o plano mensal.
        </p>
      ) : (
        <div className="max-h-[calc(100vh-12rem)] overflow-auto rounded-2xl border border-line bg-panel">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-panel">
              <tr>
                <th className="sticky left-0 z-30 min-w-52 border-r border-b border-line bg-panel px-4 py-3 text-left font-medium">
                  Funcionário
                </th>
                {plano.dias.map((dia, indice) => {
                  const separaSemana = indice > 0 && dia.domingo;

                  return (
                    <th
                      key={dia.iso}
                      data-dia={dia.iso}
                      data-prioridade={dia.prioridade ? "1" : "0"}
                      data-domingo={dia.domingo ? "1" : "0"}
                      data-semana={separaSemana ? "1" : "0"}
                      className={`min-w-16 border-b border-b-line px-2 py-3 text-center text-xs font-medium ${
                        separaSemana ? "border-l-[3px] border-l-[#e6b325]" : ""
                      } ${
                        dia.domingo ? "bg-[#f8e4e4]" : dia.prioridade ? "bg-[#d5deea]" : ""
                      }`}
                    >
                      {dia.rotulo}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {plano.linhas.map((linha, indice) => {
                const mudaEquipe =
                  indice === 0 || plano.linhas[indice - 1].equipe !== linha.equipe;

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
                            Equipe {linha.equipe}
                          </span>
                        </span>
                      </span>
                    </th>
                    {linha.folgas.map((folga, dia) => {
                      const coluna = plano.dias[dia];
                      const separaSemana = dia > 0 && coluna.domingo;
                      const prioridade = coluna.prioridade
                        ? "outline outline-1 outline-ink/30"
                        : "";

                      return (
                        <td
                          key={`${linha.id}-${coluna.iso}`}
                          data-dia={coluna.iso}
                          data-folga={folga ? "1" : "0"}
                          data-equipe={linha.equipe}
                          data-genero={linha.genero}
                          data-semana={separaSemana ? "1" : "0"}
                          className={`border-b border-b-line px-1 py-2.5 text-center text-[11px] whitespace-nowrap ${
                            mudaEquipe && indice > 0 ? "border-t-2 border-t-line" : ""
                          } ${separaSemana ? "border-l-[3px] border-l-[#e6b325]" : ""} ${
                            coluna.domingo
                              ? folga
                                ? "bg-white text-muted"
                                : "bg-[#f8e4e4] text-[#7a3b3b]"
                              : folga
                                ? "bg-field text-muted"
                                : EQUIPE_TRABALHO[linha.equipe]
                          } ${prioridade}`}
                        >
                          {folga ? "Folga" : "Trabalho"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
