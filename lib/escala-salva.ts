import { connection } from "next/server";
import { listarColaboradores, type Equipe } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { DIAS_SEMANA, isDiaSemana, type DiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import {
  aplicarTrocas,
  criarBaseEscala,
  projetarEscala,
  type BaseEscala,
  type EscalaSemana,
  type TrocaFolga,
} from "@/lib/escala";
import { EscalaSalvaModel } from "@/lib/models/escala-salva";

export const CHAVE_ESCALA = "principal";
const CHAVE_ANTIGA = "equipe-1";
const EQUIPES: Equipe[] = ["1", "2", "3"];

type ParticipanteDoc = {
  id: string;
  nome: string;
  equipe?: string;
  folgas?: boolean[];
};

type EscalaSalvaDoc = {
  equipe?: string;
  sequencial: boolean;
  numeroFolgas: number;
  numFolgasPrioridade: number;
  diasPrioridade?: string[];
  participantes?: ParticipanteDoc[];
  trocas?: { semana?: string; origemId?: string; destinoId?: string }[];
};

function normalizarTrocas(
  trocas: { semana?: string; origemId?: string; destinoId?: string }[] | undefined,
): TrocaFolga[] {
  return (trocas ?? []).flatMap((troca) => {
    if (
      !troca.semana ||
      !/^\d{4}-\d{2}-\d{2}$/.test(troca.semana) ||
      !troca.origemId ||
      !troca.destinoId ||
      troca.origemId === troca.destinoId
    ) {
      return [];
    }

    return [
      {
        semana: troca.semana,
        origemId: troca.origemId,
        destinoId: troca.destinoId,
      },
    ];
  });
}

function isEquipe(value: string | undefined): value is Equipe {
  return value === "1" || value === "2" || value === "3";
}

function normalizarFolgas(folgas: boolean[] | undefined) {
  return Array.from({ length: 7 }, (_, dia) => Boolean(folgas?.[dia]));
}

function paraBase(documento: EscalaSalvaDoc): BaseEscala {
  const dias = (documento.diasPrioridade ?? []).filter(isDiaSemana);
  const equipeDoDocumento = isEquipe(documento.equipe) ? documento.equipe : "1";

  return {
    participantes: (documento.participantes ?? [])
      .filter((participante) => participante.id && participante.nome)
      .map((participante) => ({
        id: participante.id,
        nome: participante.nome,
        equipe: isEquipe(participante.equipe)
          ? participante.equipe
          : equipeDoDocumento,
        folgas: normalizarFolgas(participante.folgas),
      })),
    sequencial: documento.sequencial,
    numeroFolgas: documento.numeroFolgas,
    numFolgasPrioridade: documento.numFolgasPrioridade,
    diasPrioridade: DIAS_SEMANA.filter((dia) => dias.includes(dia)),
    trocas: normalizarTrocas(documento.trocas),
  };
}

export async function obterBaseSalva(): Promise<BaseEscala | null> {
  await connection();
  await connectDB();
  const atual = await EscalaSalvaModel.findOne({ chave: CHAVE_ESCALA })
    .lean<EscalaSalvaDoc | null>();
  const documento =
    atual ??
    (await EscalaSalvaModel.findOne({ chave: CHAVE_ANTIGA }).lean<
      EscalaSalvaDoc | null
    >());

  if (!documento) {
    return null;
  }

  return paraBase(documento);
}

export async function salvarBase(base: BaseEscala) {
  await connection();
  await connectDB();
  await EscalaSalvaModel.findOneAndUpdate(
    { chave: CHAVE_ESCALA },
    {
      chave: CHAVE_ESCALA,
      equipe: "1",
      sequencial: base.sequencial,
      numeroFolgas: base.numeroFolgas,
      numFolgasPrioridade: base.numFolgasPrioridade,
      diasPrioridade: base.diasPrioridade satisfies DiaSemana[],
      participantes: base.participantes,
      trocas: base.trocas,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  await EscalaSalvaModel.deleteMany({ chave: CHAVE_ANTIGA });
}

export async function removerBaseSalva() {
  await connection();
  await connectDB();
  await EscalaSalvaModel.deleteMany({
    chave: { $in: [CHAVE_ESCALA, CHAVE_ANTIGA] },
  });
}

async function completarEquipesFaltantes(base: BaseEscala) {
  const presentes = new Set(base.participantes.map((participante) => participante.equipe));
  const faltam = EQUIPES.filter((equipe) => !presentes.has(equipe));

  if (faltam.length === 0) {
    return base;
  }

  const [colaboradores, config] = await Promise.all([
    listarColaboradores(),
    obterConfiguracao(),
  ]);
  const gerada = criarBaseEscala(colaboradores, {
    ...config,
    folgaSequencia: base.sequencial,
    numeroFolgas: base.numeroFolgas,
    numFolgasPrioridade: base.numFolgasPrioridade,
    diasPrioridade: base.diasPrioridade,
  });
  const completa: BaseEscala = {
    ...base,
    participantes: [
      ...base.participantes,
      ...gerada.participantes.filter((participante) =>
        faltam.includes(participante.equipe),
      ),
    ],
  };

  await removerBaseSalva();
  await salvarBase(completa);
  return completa;
}

export async function obterEscalaDaSemana(semana?: string): Promise<{
  escala: EscalaSemana;
  salva: boolean;
}> {
  const armazenada = await obterBaseSalva();

  if (armazenada) {
    const base = await completarEquipesFaltantes(armazenada);
    return {
      escala: aplicarTrocas(projetarEscala(base, semana), base.trocas),
      salva: true,
    };
  }

  const [colaboradores, config] = await Promise.all([
    listarColaboradores(),
    obterConfiguracao(),
  ]);

  return {
    escala: aplicarTrocas(
      projetarEscala(criarBaseEscala(colaboradores, config), semana),
      [],
    ),
    salva: false,
  };
}
