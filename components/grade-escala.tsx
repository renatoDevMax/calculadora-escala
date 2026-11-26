"use client";

import { useEffect, useState, useTransition } from "react";
import { trocarFolgas } from "@/app/actions/escala";
import type { Equipe } from "@/lib/colaboradores";
import type { EscalaSemana, LinhaCalendario } from "@/lib/escala";

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

type Alvo = {
  id: string;
  nome: string;
  equipe: Equipe;
  dia: number;
};

type Popup = Alvo & {
  top: number;
  left: number;
  width: number;
  height: number;
};

function textoDias(linha: LinhaCalendario, escala: EscalaSemana) {
  const nomes = escala.dias
    .filter((dia) => linha.folgas[dia.indice])
    .map((dia) => dia.nome);

  if (nomes.length === 0) {
    return "sem folga nesta semana";
  }

  if (nomes.length === 1) {
    return nomes[0];
  }

  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function GradeEscala({ escala }: { escala: EscalaSemana }) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [modal, setModal] = useState<Alvo | null>(null);
  const [filtro, setFiltro] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!popup) {
      return;
    }

    function fechar(evento: Event) {
      const alvo = evento.target;

      if (alvo instanceof Element && alvo.closest("[data-popup-troca]")) {
        return;
      }

      setPopup(null);
    }

    document.addEventListener("mousedown", fechar);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);

    return () => {
      document.removeEventListener("mousedown", fechar);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [popup]);

  useEffect(() => {
    if (!popup && !modal) {
      return;
    }

    function noEscape(evento: KeyboardEvent) {
      if (evento.key !== "Escape" || pendente) {
        return;
      }

      setPopup(null);
      setModal(null);
    }

    document.addEventListener("keydown", noEscape);
    return () => document.removeEventListener("keydown", noEscape);
  }, [popup, modal, pendente]);

  const origem = modal
    ? escala.linhas.find((linha) => linha.id === modal.id)
    : undefined;
  const colegas = origem
    ? escala.linhas.filter(
        (linha) => linha.equipe === origem.equipe && linha.id !== origem.id,
      )
    : [];
  const textoFiltro = filtro.trim().toLocaleLowerCase("pt-BR");
  const visiveis = colegas.filter((linha) =>
    linha.nome.toLocaleLowerCase("pt-BR").includes(textoFiltro),
  );

  function abrirTrocas() {
    if (!popup) {
      return;
    }

    setModal(popup);
    setPopup(null);
    setFiltro("");
    setSelecionado(null);
    setErro(null);
  }

  function confirmar() {
    if (!modal || !selecionado) {
      return;
    }

    setErro(null);
    iniciar(async () => {
      const resultado = await trocarFolgas({
        semana: escala.inicio,
        origemId: modal.id,
        destinoId: selecionado,
      });

      if (resultado?.error) {
        setErro(resultado.error);
        return;
      }

      setModal(null);
    });
  }

  return (
    <>
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
                indice === 0 || escala.linhas[indice - 1].equipe !== linha.equipe;

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
                      className={`border-b border-line p-0 text-center text-xs ${
                        mudaEquipe && indice > 0 ? "border-t-2" : ""
                      } ${
                        folga ? "bg-field text-muted" : EQUIPE_TRABALHO[linha.equipe]
                      } ${escala.dias[dia].hoje ? "outline outline-1 outline-ink/30" : ""}`}
                    >
                      {folga ? (
                        <button
                          type="button"
                          className="block w-full cursor-pointer px-2 py-2.5 hover:bg-ink/5"
                          aria-label={`Trocar a folga de ${linha.nome} em ${escala.dias[dia].nome}`}
                          onClick={(evento) => {
                            const retangulo =
                              evento.currentTarget.getBoundingClientRect();
                            setPopup({
                              id: linha.id,
                              nome: linha.nome,
                              equipe: linha.equipe,
                              dia,
                              top: retangulo.top,
                              left: retangulo.left,
                              width: retangulo.width,
                              height: retangulo.height,
                            });
                          }}
                        >
                          Folga
                        </button>
                      ) : (
                        <span className="block px-2 py-2.5">Trabalho</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {popup ? (
        <div
          data-popup-troca=""
          className="fixed z-50"
          style={{
            top: popup.top + popup.height / 2,
            left: popup.left + popup.width / 2,
            transform: "translate(-50%, -50%)",
          }}
        >
          <button
            type="button"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium shadow-lg hover:bg-field"
            onClick={abrirTrocas}
          >
            Trocas
          </button>
        </div>
      ) : null}

      {modal && origem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-troca"
            className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col rounded-2xl border border-line bg-panel p-4 shadow-lg"
          >
            <h3 id="titulo-troca" className="text-base font-semibold">
              Trocar folgas
            </h3>
            <p className="mt-1 text-sm text-muted">
              Equipe {origem.equipe}. As folgas desta semana de {origem.nome} (
              {textoDias(origem, escala)}) passam para o colaborador escolhido, e
              as dele passam para {origem.nome}.
            </p>
            <label className="mt-4 block text-sm font-medium" htmlFor="filtro-troca">
              Filtrar por nome
            </label>
            <input
              id="filtro-troca"
              value={filtro}
              autoFocus
              onChange={(evento) => setFiltro(evento.target.value)}
              placeholder="Digite parte do nome"
              className="mt-1 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-auto">
              {visiveis.map((linha) => {
                const ativo = selecionado === linha.id;

                return (
                  <li key={linha.id}>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setSelecionado(linha.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                        ativo
                          ? "border-ink bg-field"
                          : "border-transparent hover:bg-field"
                      }`}
                    >
                      <span>{linha.nome}</span>
                      <span className="text-xs text-muted">{textoDias(linha, escala)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {visiveis.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Nenhum colaborador com esse nome.
              </p>
            ) : null}
            {erro ? (
              <p className="mt-3 text-sm font-medium text-foreground">{erro}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pendente}
                onClick={() => setModal(null)}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selecionado || pendente}
                onClick={confirmar}
                className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
              >
                {pendente ? "Trocando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
