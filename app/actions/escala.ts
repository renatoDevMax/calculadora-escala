"use server";

import { refresh } from "next/cache";
import { listarColaboradores } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { criarBaseEscala } from "@/lib/escala";
import {
  obterBaseSalva,
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
