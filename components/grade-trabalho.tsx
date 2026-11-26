"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { salvarPlanoMensal } from "@/app/actions/plano-mensal";
import { GradeMensal, NavegacaoMes } from "@/components/grade-mensal";
import type { Equipe, Genero } from "@/lib/colaboradores";
import type { GradeTrabalho as Grade } from "@/lib/escala";
import { gerarPlanoMensal, type MarcacoesPlano, type PlanoMensal, type TipoFolga } from "@/lib/plano-mensal";

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

const FOLGAS_NA_SEMANA = 2;
const LARGURA_POPUP = 288;

type Marcacoes = MarcacoesPlano;

type Popup = {
  id: string;
  nome: string;
  equipe: Equipe;
  genero: Genero;
  dia: number;
  nomeDia: string;
  tipo: TipoFolga | null;
  top: number;
  left: number;
};

function rotuloGenero(genero: Genero) {
  return genero === "mulher" ? "Mulher" : "Homem";
}

function textoAlternada(genero: Genero) {
  if (genero === "mulher") {
    return "Neste dia, ou no domingo da mesma semana. Em quatro semanas, um domingo folga e o seguinte não.";
  }

  return "Neste dia, ou no domingo da mesma semana. Em quatro semanas, folga em um domingo.";
}

function folgasDaPessoa(marcacoes: Marcacoes, id: string) {
  return Object.entries(marcacoes[id] ?? {}).flatMap(([dia, tipo]) =>
    tipo ? [{ dia: Number(dia), tipo }] : [],
  );
}

function tituloDoMes(iso: string) {
  const [ano, mes] = iso.split("-").map(Number);
  const titulo = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));

  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

export function GradeTrabalho({
  grade,
  limitePrioridade,
  marcacoesIniciais,
  planoInicial,
  avisoInicial,
  meses,
}: {
  grade: Grade;
  limitePrioridade: number;
  marcacoesIniciais: Marcacoes;
  planoInicial: PlanoMensal | null;
  avisoInicial: string | null;
  meses: { anterior: string; proximo: string };
}) {
  const [marcacoes, setMarcacoes] = useState<Marcacoes>(marcacoesIniciais);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [plano, setPlano] = useState<PlanoMensal | null>(planoInicial);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(avisoInicial);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [salvando, iniciarSalvar] = useTransition();
  const espera = useRef<number | null>(null);
  const rolar = useRef(false);

  useEffect(() => {
    return () => {
      if (espera.current !== null) {
        window.clearTimeout(espera.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!plano || !rolar.current) {
      return;
    }

    rolar.current = false;
    document.getElementById("plano-mensal")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [plano]);

  useEffect(() => {
    if (window.location.hash === "#plano-mensal") {
      document.getElementById("plano-mensal")?.scrollIntoView({ block: "start" });
    }
  }, []);

  useEffect(() => {
    if (!popup) {
      return;
    }

    function fechar(evento: Event) {
      const alvo = evento.target;

      if (alvo instanceof Element && alvo.closest("[data-popup-folga]")) {
        return;
      }

      setPopup(null);
    }

    function noEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setPopup(null);
      }
    }

    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", noEscape);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);

    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", noEscape);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [popup]);

  const pessoaPopup = popup ? folgasDaPessoa(marcacoes, popup.id) : [];
  const fixaEmOutroDia = pessoaPopup.find(
    (folga) => folga.tipo === "fixa" && folga.dia !== popup?.dia,
  );
  const alternadaEmOutroDia = pessoaPopup.find(
    (folga) => folga.tipo === "alternada" && folga.dia !== popup?.dia,
  );
  const nomeDiaFixa = fixaEmOutroDia
    ? grade.dias[fixaEmOutroDia.dia]?.nome
    : undefined;
  const nomeDiaAlternada = alternadaEmOutroDia
    ? grade.dias[alternadaEmOutroDia.dia]?.nome
    : undefined;
  const diaDePrioridade = Boolean(
    popup && grade.dias[popup.dia]?.prioridade && popup.tipo !== "fixa",
  );

  function abrir(
    evento: MouseEvent<HTMLButtonElement>,
    linha: Grade["linhas"][number],
    dia: number,
    tipo: TipoFolga | null,
  ) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    const centro = retangulo.top + retangulo.height / 2;
    const left = Math.min(
      Math.max(12, retangulo.left + retangulo.width / 2 - LARGURA_POPUP / 2),
      window.innerWidth - LARGURA_POPUP - 12,
    );
    const top = Math.min(Math.max(12, centro - 88), window.innerHeight - 220);

    setPopup({
      id: linha.id,
      nome: linha.nome,
      equipe: linha.equipe,
      genero: linha.genero,
      dia,
      nomeDia: grade.dias[dia].nome,
      tipo,
      top,
      left,
    });
  }

  function marcar(tipo: TipoFolga) {
    if (!popup) {
      return;
    }

    if (tipo === "fixa" && (fixaEmOutroDia || diaDePrioridade)) {
      return;
    }

    if (tipo === "alternada" && alternadaEmOutroDia) {
      return;
    }

    setMarcacoes((atual) => ({
      ...atual,
      [popup.id]: { ...atual[popup.id], [popup.dia]: tipo },
    }));
    setPlano(null);
    setAviso(null);
    setErroSalvar(null);
    setPopup(null);
  }

  function tirar() {
    if (!popup?.tipo) {
      return;
    }

    setMarcacoes((atual) => {
      const pessoa = { ...atual[popup.id] };
      delete pessoa[popup.dia];
      return { ...atual, [popup.id]: pessoa };
    });
    setPlano(null);
    setAviso(null);
    setErroSalvar(null);
    setPopup(null);
  }

  function gerar() {
    setPopup(null);
    setGerando(true);

    if (espera.current !== null) {
      window.clearTimeout(espera.current);
    }

    espera.current = window.setTimeout(() => {
      const resultado = gerarPlanoMensal({
        inicioSemana: grade.inicio,
        pessoas: grade.linhas,
        marcacoes,
        diasPrioridade: grade.dias.filter((dia) => dia.prioridade).map((dia) => dia.nome),
        limitePrioridade,
      });
      rolar.current = true;
      setMarcacoes(resultado.marcacoes);
      setPlano(resultado.plano);
      setAviso(null);
      setErroSalvar(null);
      setGerando(false);
      espera.current = null;
    }, 700);
  }

  function salvar() {
    if (!plano) {
      return;
    }

    setErroSalvar(null);
    iniciarSalvar(async () => {
      const resultado = await salvarPlanoMensal({
        plano,
        marcacoes,
        diasPrioridade: grade.dias.filter((dia) => dia.prioridade).map((dia) => dia.nome),
      });

      if (resultado?.error) {
        setErroSalvar(resultado.error);
        return;
      }

      setAviso("Escala salva.");
    });
  }

  async function exportar() {
    if (!plano) {
      return;
    }

    setExportando(true);
    setErroSalvar(null);

    try {
      const resposta = await fetch("/api/gerar-escala/planilha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana: {
            titulo: grade.titulo,
            dias: grade.dias.map((dia) => ({
              nome: dia.nome,
              rotulo: dia.rotulo,
              prioridade: dia.prioridade,
              domingo: dia.nome === "Domingo",
            })),
            linhas: grade.linhas.map((linha) => ({
              nome: linha.nome,
              equipe: linha.equipe,
              celulas: grade.dias.map((dia) => {
                if (dia.nome === "Domingo") {
                  return "Trabalho";
                }

                const tipo = marcacoes[linha.id]?.[dia.indice];
                if (tipo === "fixa") {
                  return "Fixa";
                }

                if (tipo === "alternada") {
                  return "Alternada";
                }

                return "Trabalho";
              }),
            })),
          },
          plano,
        }),
      });

      if (!resposta.ok) {
        setErroSalvar("Não foi possível gerar o Excel.");
        return;
      }

      const arquivo = await resposta.blob();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `escala-${plano.dias[0]?.iso.slice(0, 7) ?? "mensal"}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErroSalvar("Não foi possível gerar o Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">Semana</p>
        <h2 className="text-xl font-semibold tracking-tight">{grade.titulo}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Cada pessoa tem uma folga fixa e uma folga alternada. Nos dias de
          prioridade só cabe folga alternada, sem limite de quantidade.
          Domingo não recebe folga manual.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {(["1", "2", "3"] as Equipe[]).map((equipe) => (
          <span key={equipe} className="inline-flex items-center gap-2">
            <span className={`size-3 rounded-full ${EQUIPE_MARCA[equipe]}`} />
            Equipe {equipe}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-field" />
          Fixa
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-[#efe4c4]" />
          Alternada
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-[#f3d6d6]" />
          Domingo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-[#d5deea]" />
          Prioridade
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={gerar}
          disabled={gerando || grade.linhas.length === 0}
          className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
        >
          Gerar plano mensal
        </button>
      </div>

      {grade.linhas.length === 0 ? (
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
                {grade.dias.map((dia) => {
                  const domingo = dia.nome === "Domingo";
                  const porEquipe = (["1", "2", "3"] as Equipe[]).map((equipe) =>
                    grade.linhas.filter(
                      (linha) =>
                        linha.equipe === equipe &&
                        marcacoes[linha.id]?.[dia.indice],
                    ).length,
                  );
                  const total = porEquipe.reduce((soma, valor) => soma + valor, 0);

                  return (
                    <th
                      key={dia.iso}
                      data-prioridade={dia.prioridade ? "1" : "0"}
                      className={`border-b border-line px-2 py-3 text-center font-medium ${
                        domingo
                          ? "bg-[#f8e4e4]"
                          : dia.prioridade
                            ? "bg-[#d5deea]"
                            : ""
                      }`}
                    >
                      <span className="block">{dia.nome}</span>
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {dia.rotulo}
                        {dia.hoje ? " · hoje" : ""}
                      </span>
                      {dia.prioridade ? (
                        <span className="mt-1 block text-xs font-medium text-ink">
                          Prioridade
                        </span>
                      ) : null}
                      {domingo ? (
                        <span className="mt-1 block text-xs font-normal text-[#7a3b3b]">
                          sem folga manual
                        </span>
                      ) : (
                        <>
                          <span className="mt-1 block text-xs font-normal text-muted">
                            {total} no total
                          </span>
                          <span className="block text-xs font-normal text-muted">
                            equipes {porEquipe.join(" · ")}
                          </span>
                        </>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {grade.linhas.map((linha, indice) => {
                const mudaEquipe =
                  indice === 0 || grade.linhas[indice - 1].equipe !== linha.equipe;
                const quantidade = folgasDaPessoa(marcacoes, linha.id).length;

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
                            Equipe {linha.equipe} · {rotuloGenero(linha.genero)} ·{" "}
                            {quantidade} de {FOLGAS_NA_SEMANA}
                          </span>
                        </span>
                      </span>
                    </th>
                    {grade.dias.map((dia) => {
                      const domingo = dia.nome === "Domingo";
                      const tipo = marcacoes[linha.id]?.[dia.indice] ?? null;
                      const borda = mudaEquipe && indice > 0 ? "border-t-2" : "";
                      const prioridade = dia.prioridade
                        ? "outline outline-1 outline-ink/30"
                        : "";

                      if (domingo) {
                        return (
                          <td
                            key={`${linha.id}-${dia.indice}`}
                            data-dia={dia.indice}
                            data-domingo="1"
                            className={`border-b border-line bg-[#f8e4e4] px-2 py-2.5 text-center text-xs text-[#7a3b3b] ${borda} ${prioridade}`}
                          >
                            Trabalho
                          </td>
                        );
                      }

                      const classeTipo =
                        tipo === "fixa"
                          ? "bg-field text-muted"
                          : tipo === "alternada"
                            ? "bg-[#efe4c4] text-[#5c4a1c]"
                            : EQUIPE_TRABALHO[linha.equipe];

                      return (
                        <td
                          key={`${linha.id}-${dia.indice}`}
                          data-dia={dia.indice}
                          data-tipo={tipo ?? "trabalho"}
                          data-equipe={linha.equipe}
                          className={`border-b border-line p-0 text-center text-xs ${borda} ${classeTipo} ${prioridade}`}
                        >
                          <button
                            type="button"
                            className="block w-full cursor-pointer px-2 py-2.5 hover:bg-ink/5"
                            aria-label={`${linha.nome}, ${dia.nome}, ${rotuloGenero(linha.genero)}`}
                            onClick={(evento) => abrir(evento, linha, dia.indice, tipo)}
                          >
                            {tipo === "fixa"
                              ? "Fixa"
                              : tipo === "alternada"
                                ? "Alternada"
                                : "Trabalho"}
                          </button>
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

      {plano ? (
        <>
          <GradeMensal plano={plano} anterior={meses.anterior} proximo={meses.proximo} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || exportando || gerando}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar Escala"}
            </button>
            <button
              type="button"
              onClick={exportar}
              disabled={salvando || exportando || gerando}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field disabled:opacity-60"
            >
              {exportando ? "Gerando..." : "Gerar Excel"}
            </button>
          </div>
          {aviso ? <p className="text-right text-sm text-muted">{aviso}</p> : null}
          {erroSalvar ? (
            <p className="text-right text-sm font-medium text-foreground">{erroSalvar}</p>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-sm text-muted">Mês</p>
          <NavegacaoMes
            titulo={tituloDoMes(grade.inicio)}
            anterior={meses.anterior}
            proximo={meses.proximo}
          />
        </div>
      )}

      {gerando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <p className="rounded-2xl border border-line bg-panel px-6 py-4 text-sm font-medium shadow-lg">
            Gerando plano mensal...
          </p>
        </div>
      ) : null}

      {popup ? (
        <div
          data-popup-folga=""
          role="dialog"
          aria-label={`Folga de ${popup.nome} em ${popup.nomeDia}`}
          className="fixed z-50 w-72 rounded-xl border border-line bg-panel p-3 shadow-lg"
          style={{ top: popup.top, left: popup.left }}
        >
          <p className="text-sm font-medium">{popup.nome}</p>
          <p className="mt-0.5 text-xs text-muted">
            {rotuloGenero(popup.genero)} · {popup.nomeDia}
          </p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              aria-pressed={popup.tipo === "fixa"}
              disabled={Boolean(fixaEmOutroDia) || diaDePrioridade}
              onClick={() => marcar("fixa")}
              className={`block w-full rounded-lg border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                popup.tipo === "fixa"
                  ? "border-ink bg-field"
                  : "border-line bg-panel hover:bg-field"
              }`}
            >
              <span className="block text-sm font-medium">Folga fixa</span>
              <span className="mt-0.5 block text-xs text-muted">
                {nomeDiaFixa
                  ? `A folga fixa já está em ${nomeDiaFixa}.`
                  : diaDePrioridade
                    ? "Neste dia de prioridade só cabe folga alternada."
                    : "Sempre folga neste dia."}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={popup.tipo === "alternada"}
              disabled={Boolean(alternadaEmOutroDia)}
              onClick={() => marcar("alternada")}
              className={`block w-full rounded-lg border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                popup.tipo === "alternada"
                  ? "border-ink bg-[#efe4c4]"
                  : "border-line bg-panel hover:bg-field"
              }`}
            >
              <span className="block text-sm font-medium">Folga alternada</span>
              <span className="mt-0.5 block text-xs text-muted">
                {nomeDiaAlternada
                  ? `A folga alternada já está em ${nomeDiaAlternada}.`
                  : textoAlternada(popup.genero)}
              </span>
            </button>
            {popup.tipo ? (
              <button
                type="button"
                onClick={tirar}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-muted hover:bg-field"
              >
                Tirar folga
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
