"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import {
  buscarProximasFolgas,
  confirmarTrocaFolgaMensal,
} from "@/app/actions/troca-mensal";
import type { Equipe } from "@/lib/colaboradores";
import type { PlanoMensal } from "@/lib/plano-mensal";
import type { DataFolga, TrocaVisivel } from "@/lib/trocas-mensais";

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

type FolgaClicada = {
  id: string;
  nome: string;
  iso: string;
  rotulo: string;
  top: number;
  left: number;
};

type DetalheTroca = {
  top: number;
  left: number;
  trocas: TrocaVisivel[];
};

function IconeTroca() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 5h9" />
      <path d="M8.5 2.5 11.5 5 8.5 7.5" />
      <path d="M14 11H5" />
      <path d="M7.5 8.5 4.5 11l3 2.5" />
    </svg>
  );
}

function marcasPorCelula(trocas: TrocaVisivel[]) {
  const marcas = new Map<string, TrocaVisivel[]>();

  for (const troca of trocas) {
    for (const chave of [
      `${troca.origemId}|${troca.origemIso}`,
      `${troca.origemId}|${troca.destinoIso}`,
      `${troca.destinoId}|${troca.destinoIso}`,
      `${troca.destinoId}|${troca.origemIso}`,
    ]) {
      const lista = marcas.get(chave) ?? [];
      if (!lista.some((item) => item.id === troca.id)) {
        lista.push(troca);
      }
      marcas.set(chave, lista);
    }
  }

  return marcas;
}

export function GradeMensal({
  plano,
  anterior,
  proximo,
  rota = "/gerar-escala",
  permitirTroca = false,
  trocas = [],
}: {
  plano: PlanoMensal;
  anterior: string;
  proximo: string;
  rota?: string;
  permitirTroca?: boolean;
  trocas?: TrocaVisivel[];
}) {
  const [popup, setPopup] = useState<FolgaClicada | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheTroca | null>(null);
  const [origem, setOrigem] = useState<FolgaClicada | null>(null);
  const [filtro, setFiltro] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [datas, setDatas] = useState<DataFolga[] | null>(null);
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!popup && !detalhe) {
      return;
    }

    function fechar(evento: Event) {
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest("[data-popup-troca]")) {
        return;
      }
      setPopup(null);
      setDetalhe(null);
    }

    document.addEventListener("mousedown", fechar);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);
    return () => {
      document.removeEventListener("mousedown", fechar);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [popup, detalhe]);

  useEffect(() => {
    if (!popup && !origem && !detalhe) {
      return;
    }

    function noEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !pendente) {
        setPopup(null);
        setOrigem(null);
        setDetalhe(null);
      }
    }

    document.addEventListener("keydown", noEscape);
    return () => document.removeEventListener("keydown", noEscape);
  }, [popup, origem, detalhe, pendente]);

  const textoFiltro = filtro.trim().toLocaleLowerCase("pt-BR");
  const colegas = plano.linhas.filter(
    (linha) =>
      linha.id !== origem?.id &&
      linha.nome.toLocaleLowerCase("pt-BR").includes(textoFiltro),
  );
  const destino = plano.linhas.find((linha) => linha.id === selecionado);
  const marcas = marcasPorCelula(trocas);

  function abrirDetalhe(evento: MouseEvent<HTMLButtonElement>, lista: TrocaVisivel[]) {
    evento.stopPropagation();
    const retangulo = evento.currentTarget.getBoundingClientRect();
    const largura = 288;
    setPopup(null);
    setDetalhe({
      top: retangulo.bottom + 6,
      left: Math.min(Math.max(16, retangulo.left), window.innerWidth - largura - 16),
      trocas: lista,
    });
  }

  function abrirLista() {
    if (!popup) {
      return;
    }

    setOrigem(popup);
    setPopup(null);
    setFiltro("");
    setSelecionado(null);
    setDatas(null);
    setDataEscolhida(null);
    setErro(null);
  }

  function confirmarPessoa() {
    if (!origem || !selecionado) {
      return;
    }

    setErro(null);
    iniciar(async () => {
      const resultado = await buscarProximasFolgas({
        colaboradorId: selecionado,
        depoisDe: origem.iso,
      });

      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }

      setDatas(resultado.datas);
      setDataEscolhida(null);
    });
  }

  function confirmarData() {
    if (!origem || !selecionado || !dataEscolhida) {
      return;
    }

    setErro(null);
    iniciar(async () => {
      const resultado = await confirmarTrocaFolgaMensal({
        origemId: origem.id,
        origemIso: origem.iso,
        destinoId: selecionado,
        destinoIso: dataEscolhida,
      });

      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }

      setOrigem(null);
    });
  }

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
        {trocas.length > 0 ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">
            O ícone nas células marca uma troca ocasional. Clique nele para ver quem trocou e
            quais datas.
          </p>
        ) : null}
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
                      const marcasCelula = marcas.get(`${linha.id}|${coluna.iso}`) ?? [];
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
                          data-troca={marcasCelula.length > 0 ? "1" : "0"}
                          className={`border-b border-b-line text-center text-[11px] whitespace-nowrap ${
                            (permitirTroca && folga) || marcasCelula.length > 0
                              ? "p-0"
                              : "px-1 py-2.5"
                          } ${mudaEquipe && indice > 0 ? "border-t-2 border-t-line" : ""} ${
                            separaSemana ? "border-l-[3px] border-l-[#e6b325]" : ""
                          } ${
                            coluna.domingo
                              ? folga
                                ? "bg-white text-muted"
                                : "bg-[#f8e4e4] text-[#7a3b3b]"
                              : folga
                                ? "bg-field text-muted"
                                : EQUIPE_TRABALHO[linha.equipe]
                          } ${prioridade}`}
                        >
                          {marcasCelula.length > 0 ? (
                            <div className="flex flex-col items-center px-1 py-1">
                              <button
                                type="button"
                                aria-label={`Ver troca de ${linha.nome} em ${coluna.rotulo}`}
                                onClick={(evento) => abrirDetalhe(evento, marcasCelula)}
                                className="inline-flex size-5 items-center justify-center rounded-full border border-[#e6b325] bg-[#efe4c4] text-[#6a3d18] hover:bg-[#e6b325]"
                              >
                                <IconeTroca />
                              </button>
                              {permitirTroca && folga ? (
                                <button
                                  type="button"
                                  className="block w-full cursor-pointer px-1 py-1 hover:bg-ink/5"
                                  aria-label={`${linha.nome}, folga em ${coluna.rotulo}`}
                                  onClick={(evento) => {
                                    const retangulo = evento.currentTarget.getBoundingClientRect();
                                    setDetalhe(null);
                                    setPopup({
                                      id: linha.id,
                                      nome: linha.nome,
                                      iso: coluna.iso,
                                      rotulo: coluna.rotulo,
                                      top: retangulo.top + retangulo.height / 2,
                                      left: retangulo.left + retangulo.width / 2,
                                    });
                                  }}
                                >
                                  Folga
                                </button>
                              ) : (
                                <span className="py-1">{folga ? "Folga" : "Trabalho"}</span>
                              )}
                            </div>
                          ) : permitirTroca && folga ? (
                            <button
                              type="button"
                              className="block w-full cursor-pointer px-1 py-2.5 hover:bg-ink/5"
                              aria-label={`${linha.nome}, folga em ${coluna.rotulo}`}
                              onClick={(evento) => {
                                const retangulo = evento.currentTarget.getBoundingClientRect();
                                setDetalhe(null);
                                setPopup({
                                  id: linha.id,
                                  nome: linha.nome,
                                  iso: coluna.iso,
                                  rotulo: coluna.rotulo,
                                  top: retangulo.top + retangulo.height / 2,
                                  left: retangulo.left + retangulo.width / 2,
                                });
                              }}
                            >
                              Folga
                            </button>
                          ) : folga ? (
                            "Folga"
                          ) : (
                            "Trabalho"
                          )}
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

      {popup ? (
        <div
          data-popup-troca=""
          className="fixed z-50"
          style={{ top: popup.top, left: popup.left, transform: "translate(-50%, -50%)" }}
        >
          <button
            type="button"
            onClick={abrirLista}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium shadow-lg hover:bg-field"
          >
            Trocar
          </button>
        </div>
      ) : null}

      {detalhe ? (
        <div
          data-popup-troca=""
          className="fixed z-50 w-72 rounded-xl border border-line bg-panel p-3 text-sm shadow-lg"
          style={{ top: detalhe.top, left: detalhe.left }}
        >
          <p className="text-xs font-medium text-muted">Troca ocasional</p>
          <div className="mt-2 space-y-3">
            {detalhe.trocas.map((troca) => (
              <div key={troca.id}>
                <p>
                  <span className="font-medium">{troca.origemNome}</span> folgava em{" "}
                  {troca.origemRotulo}.
                </p>
                <p className="mt-1">
                  <span className="font-medium">{troca.destinoNome}</span> folgava em{" "}
                  {troca.destinoRotulo}.
                </p>
                <p className="mt-1 text-muted">
                  Essas duas datas foram invertidas.
                  {troca.registradaEm ? ` Registrada em ${troca.registradaEm}.` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {origem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-troca-mensal"
            className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col rounded-2xl border border-line bg-panel p-4 shadow-lg"
          >
            {datas ? (
              <>
                <h3 id="titulo-troca-mensal" className="text-base font-semibold">
                  Escolher folga
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Próximas folgas de {destino?.nome}. A data escolhida troca com a folga de{" "}
                  {origem.nome} em {origem.rotulo}.
                </p>
                <ul className="mt-4 min-h-0 flex-1 space-y-1 overflow-auto">
                  {datas.map((data) => {
                    const ativa = dataEscolhida === data.iso;

                    return (
                      <li key={data.iso}>
                        <button
                          type="button"
                          aria-pressed={ativa}
                          onClick={() => setDataEscolhida(data.iso)}
                          className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                            ativa ? "border-ink bg-field" : "border-transparent hover:bg-field"
                          }`}
                        >
                          {data.rotulo}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <h3 id="titulo-troca-mensal" className="text-base font-semibold">
                  Trocar folga
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Folga de {origem.nome} em {origem.rotulo}. Escolha o colaborador da troca.
                </p>
                <label className="mt-4 block text-sm font-medium" htmlFor="filtro-troca-mensal">
                  Filtrar por nome
                </label>
                <input
                  id="filtro-troca-mensal"
                  value={filtro}
                  autoFocus
                  onChange={(evento) => setFiltro(evento.target.value)}
                  placeholder="Digite parte do nome"
                  className="mt-1 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm outline-none focus:border-ink"
                />
                <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-auto">
                  {colegas.map((linha) => {
                    const ativa = selecionado === linha.id;

                    return (
                      <li key={linha.id}>
                        <button
                          type="button"
                          aria-pressed={ativa}
                          onClick={() => setSelecionado(linha.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                            ativa ? "border-ink bg-field" : "border-transparent hover:bg-field"
                          }`}
                        >
                          <span>{linha.nome}</span>
                          <span className="text-xs text-muted">Equipe {linha.equipe}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {colegas.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Nenhum colaborador com esse nome.</p>
                ) : null}
              </>
            )}
            {erro ? <p className="mt-3 text-sm font-medium text-foreground">{erro}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pendente}
                onClick={() => setOrigem(null)}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendente || (datas ? !dataEscolhida : !selecionado)}
                onClick={datas ? confirmarData : confirmarPessoa}
                className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
              >
                {pendente ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
