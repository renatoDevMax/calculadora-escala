"use server";

import { refresh } from "next/cache";
import { listarColaboradores } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { criarBaseEscala, segundaDaSemana } from "@/lib/escala";
import {
  obterBaseSalva,
  obterEscalaDaSemana,
  removerBaseSalva,
  salvarBase,
} from "@/lib/escala-salva";

export type RecalculoState = {
  ok?: boolean;
  limite?: number;
  error?: string;
} | null;

export type SalvamentoState = {
  ok?: boolean;
  error?: string;
} | null;

export type TrocaState = {
  ok?: boolean;
  error?: string;
} | null;

export async function salvarEscala(): Promise<SalvamentoState> {
  try {
    const existente = await obterBaseSalva();

    if (existente) {
      return {
        error:
          "A escala já está salva. Ela só é substituída ao recalcular.",
      };
    }

    const [colaboradores, config] = await Promise.all([
      listarColaboradores(),
      obterConfiguracao(),
    ]);
    await salvarBase(criarBaseEscala(colaboradores, config));
    refresh();

    return { ok: true };
  } catch {
    return { error: "Não foi possível salvar a escala." };
  }
}

export async function recalcularEscala(): Promise<RecalculoState> {
  try {
    const [colaboradores, config] = await Promise.all([
      listarColaboradores(),
      obterConfiguracao(),
    ]);
    const base = criarBaseEscala(colaboradores, config);

    await removerBaseSalva();
    await salvarBase(base);
    refresh();

    return {
      ok: true,
      limite: base.numFolgasPrioridade,
    };
  } catch {
    return { error: "Não foi possível recalcular a escala." };
  }
}

export async function trocarFolgas(entrada: {
  semana: string;
  origemId: string;
  destinoId: string;
}): Promise<TrocaState> {
  try {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(entrada.semana) ||
      !entrada.origemId ||
      !entrada.destinoId ||
      entrada.origemId === entrada.destinoId
    ) {
      return { error: "Escolha outro colaborador da mesma equipe." };
    }

    const semana = segundaDaSemana(entrada.semana);
    const { escala } = await obterEscalaDaSemana(semana);
    const origem = escala.linhas.find((linha) => linha.id === entrada.origemId);
    const destino = escala.linhas.find((linha) => linha.id === entrada.destinoId);

    if (!origem || !destino || origem.equipe !== destino.equipe) {
      return { error: "A troca é só entre colaboradores da mesma equipe." };
    }

    const [colaboradores, config] = await Promise.all([
      listarColaboradores(),
      obterConfiguracao(),
    ]);
    const base =
      (await obterBaseSalva()) ?? criarBaseEscala(colaboradores, config);

    await salvarBase({
      ...base,
      trocas: [
        ...base.trocas,
        {
          semana: escala.inicio,
          origemId: origem.id,
          destinoId: destino.id,
        },
      ],
    });
    refresh();

    return { ok: true };
  } catch {
    return { error: "Não foi possível trocar as folgas." };
  }
}
