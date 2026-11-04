import { connection } from "next/server";
import { DIAS_SEMANA, isDiaSemana, type DiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import { ConfiguracaoModel } from "@/lib/models/configuracao";

export const CHAVE_CONFIG = "principal";

export type Configuracao = {
  tempoIntervalo: number;
  folgaSequencia: boolean;
  diasPrioridade: DiaSemana[];
  jornadaHorasDiaria: number;
  numeroFolgas: number;
  numFolgasPrioridade: number;
};

export const CONFIG_PADRAO: Configuracao = {
  tempoIntervalo: 60,
  folgaSequencia: false,
  diasPrioridade: [],
  jornadaHorasDiaria: 8,
  numeroFolgas: 1,
  numFolgasPrioridade: 0,
};

type ConfiguracaoDoc = {
  tempoIntervalo: number;
  folgaSequencia: boolean;
  diasPrioridade?: string[];
  jornadaHorasDiaria: number;
  numeroFolgas: number;
  numFolgasPrioridade?: number;
};

export async function obterConfiguracao(): Promise<Configuracao> {
  await connection();
  await connectDB();
  const documento = await ConfiguracaoModel.findOne({ chave: CHAVE_CONFIG })
    .lean<ConfiguracaoDoc | null>();

  if (!documento) {
    return CONFIG_PADRAO;
  }

  const dias = (documento.diasPrioridade ?? []).filter(isDiaSemana);

  return {
    tempoIntervalo: documento.tempoIntervalo,
    folgaSequencia: documento.folgaSequencia,
    diasPrioridade: DIAS_SEMANA.filter((dia) => dias.includes(dia)),
    jornadaHorasDiaria: documento.jornadaHorasDiaria,
    numeroFolgas: documento.numeroFolgas,
    numFolgasPrioridade: documento.numFolgasPrioridade ?? 0,
  };
}
