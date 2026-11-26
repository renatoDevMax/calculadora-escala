"use server";

import { refresh } from "next/cache";
import { proximasFolgas, registrarTrocaFolga, type DataFolga } from "@/lib/trocas-mensais";

export async function buscarProximasFolgas(entrada: {
  colaboradorId: string;
  depoisDe: string;
}): Promise<{ datas: DataFolga[] } | { error: string }> {
  try {
    const datas = await proximasFolgas(entrada.colaboradorId, entrada.depoisDe);
    if (datas.length === 0) {
      return { error: "Esse colaborador não tem próximas folgas para trocar." };
    }

    return { datas };
  } catch {
    return { error: "Não foi possível listar as folgas." };
  }
}

export async function confirmarTrocaFolgaMensal(entrada: {
  origemId: string;
  origemIso: string;
  destinoId: string;
  destinoIso: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const resultado = await registrarTrocaFolga(entrada);
    if ("error" in resultado) {
      return resultado;
    }

    refresh();
    return { ok: true };
  } catch {
    return { error: "Não foi possível trocar as folgas." };
  }
}
