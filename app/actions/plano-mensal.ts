"use server";

import { refresh } from "next/cache";
import { isDiaSemana, type DiaSemana } from "@/lib/dias";
import {
  diasFolgaDasMarcacoes,
  salvarPlanoNoBanco,
} from "@/lib/plano-mensal-salvo";
import type { MarcacoesPlano, PlanoMensal } from "@/lib/plano-mensal";

export type SalvamentoPlano = {
  ok?: boolean;
  error?: string;
} | null;

export async function salvarPlanoMensal(entrada: {
  plano: PlanoMensal;
  marcacoes: MarcacoesPlano;
  diasPrioridade: DiaSemana[];
}): Promise<SalvamentoPlano> {
  try {
    const diasFolga = diasFolgaDasMarcacoes(
      entrada.plano.linhas.map((linha) => linha.id),
      entrada.marcacoes,
    );

    if (!diasFolga) {
      return {
        error: "Cada colaborador precisa de uma folga fixa e uma folga alternada.",
      };
    }

    const diasPrioridade = entrada.diasPrioridade.filter(isDiaSemana);
    const resultado = await salvarPlanoNoBanco(entrada.plano, diasFolga, diasPrioridade);

    if ("error" in resultado) {
      return { error: resultado.error };
    }

    refresh();
    return { ok: true };
  } catch {
    return { error: "Não foi possível salvar a escala." };
  }
}
