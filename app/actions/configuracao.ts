"use server";

import { refresh } from "next/cache";
import { DIAS_SEMANA, isDiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import { CHAVE_CONFIG } from "@/lib/configuracao";
import { ConfiguracaoModel } from "@/lib/models/configuracao";

export type FormState = {
  error?: string;
  ok?: boolean;
} | null;

function lerNumero(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const numero = Number(value);
  if (!Number.isFinite(numero) || numero < 0) {
    return null;
  }

  return numero;
}

export async function salvarConfiguracao(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const tempoIntervalo = lerNumero(formData.get("tempoIntervalo"));
  const jornadaHorasDiaria = lerNumero(formData.get("jornadaHorasDiaria"));
  const numeroFolgas = lerNumero(formData.get("numeroFolgas"));
  const numFolgasPrioridade = lerNumero(formData.get("numFolgasPrioridade"));
  const diasInformados = formData.getAll("diasPrioridade").map(String);
  const diasPrioridade = DIAS_SEMANA.filter((dia) =>
    diasInformados.includes(dia),
  );

  if (tempoIntervalo === null) {
    return { error: "Informe um tempo de intervalo válido." };
  }

  if (jornadaHorasDiaria === null) {
    return { error: "Informe uma jornada diária válida." };
  }

  if (numeroFolgas === null || !Number.isInteger(numeroFolgas)) {
    return { error: "O número de folgas precisa ser um inteiro." };
  }

  if (numFolgasPrioridade === null || !Number.isInteger(numFolgasPrioridade)) {
    return {
      error: "O máximo de folgas nos dias de prioridade precisa ser um inteiro.",
    };
  }

  if (diasInformados.some((dia) => !isDiaSemana(dia))) {
    return { error: "Há um dia da semana inválido na seleção." };
  }

  await connectDB();
  await ConfiguracaoModel.findOneAndUpdate(
    { chave: CHAVE_CONFIG },
    {
      chave: CHAVE_CONFIG,
      tempoIntervalo,
      folgaSequencia: formData.get("folgaSequencia") === "on",
      diasPrioridade,
      jornadaHorasDiaria,
      numeroFolgas,
      numFolgasPrioridade,
    },
    { upsert: true, new: true, runValidators: true },
  );
  refresh();

  return { ok: true };
}
