import { connection } from "next/server";
import { listarColaboradores } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { DIAS_SEMANA, isDiaSemana, type DiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import {
  criarBaseEscala,
  projetarEscala,
  type BaseEscala,
  type EscalaSemana,
} from "@/lib/escala";
import { EscalaSalvaModel } from "@/lib/models/escala-salva";

export const CHAVE_ESCALA = "equipe-1";

type ParticipanteDoc = {
  id: string;
  nome: string;
  folgas?: boolean[];
};

type EscalaSalvaDoc = {
  sequencial: boolean;
  numeroFolgas: number;
  numFolgasPrioridade: number;
  diasPrioridade?: string[];
  participantes?: ParticipanteDoc[];
};

function normalizarFolgas(folgas: boolean[] | undefined) {
  return Array.from({ length: 7 }, (_, dia) => Boolean(folgas?.[dia]));
}

function paraBase(documento: EscalaSalvaDoc): BaseEscala {
  const dias = (documento.diasPrioridade ?? []).filter(isDiaSemana);

  return {
    participantes: (documento.participantes ?? [])
      .filter((participante) => participante.id && participante.nome)
      .map((participante) => ({
        id: participante.id,
        nome: participante.nome,
        folgas: normalizarFolgas(participante.folgas),
      })),
    sequencial: documento.sequencial,
    numeroFolgas: documento.numeroFolgas,
    numFolgasPrioridade: documento.numFolgasPrioridade,
    diasPrioridade: DIAS_SEMANA.filter((dia) => dias.includes(dia)),
  };
}

export async function obterBaseSalva(): Promise<BaseEscala | null> {
  await connection();
  await connectDB();
  const documento = await EscalaSalvaModel.findOne({ chave: CHAVE_ESCALA })
    .lean<EscalaSalvaDoc | null>();

  if (!documento) {
    return null;
  }

  return paraBase(documento);
}

export async function salvarBase(base: BaseEscala) {
  await connection();
  await connectDB();
  await EscalaSalvaModel.create({
    chave: CHAVE_ESCALA,
    equipe: "1",
    sequencial: base.sequencial,
    numeroFolgas: base.numeroFolgas,
    numFolgasPrioridade: base.numFolgasPrioridade,
    diasPrioridade: base.diasPrioridade satisfies DiaSemana[],
    participantes: base.participantes,
  });
}

export async function removerBaseSalva() {
  await connection();
  await connectDB();
  await EscalaSalvaModel.deleteMany({ chave: CHAVE_ESCALA });
}

export async function obterEscalaDaSemana(semana?: string): Promise<{
  escala: EscalaSemana;
  salva: boolean;
}> {
  const base = await obterBaseSalva();

  if (base) {
    return { escala: projetarEscala(base, semana), salva: true };
  }

  const [colaboradores, config] = await Promise.all([
    listarColaboradores(),
    obterConfiguracao(),
  ]);

  return {
    escala: projetarEscala(criarBaseEscala(colaboradores, config), semana),
    salva: false,
  };
}
