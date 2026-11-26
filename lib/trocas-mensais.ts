import mongoose from "mongoose";
import { connection } from "next/server";
import { listarColaboradores } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { montarGradeTrabalho } from "@/lib/escala";
import { connectDB } from "@/lib/db";
import { TrocaFolgaMensalModel } from "@/lib/models/troca-folga-mensal";
import {
  gerarPlanoMensal,
  marcacoesDeDiasFolga,
  type PlanoMensal,
} from "@/lib/plano-mensal";

export type TrocaFolgaMensal = {
  origemId: string;
  origemIso: string;
  destinoId: string;
  destinoIso: string;
};

export type TrocaFolgaRegistrada = TrocaFolgaMensal & {
  id: string;
  criadaEm: string;
};

export type TrocaVisivel = {
  id: string;
  origemId: string;
  origemNome: string;
  origemEquipe: string;
  origemIso: string;
  origemRotulo: string;
  destinoId: string;
  destinoNome: string;
  destinoEquipe: string;
  destinoIso: string;
  destinoRotulo: string;
  registradaEm: string;
};

export type DataFolga = {
  iso: string;
  rotulo: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dataUtc(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function isoDeUtc(data: Date) {
  return data.toISOString().slice(0, 10);
}

function primeiraSegunda(ano: number, mes: number) {
  const data = new Date(Date.UTC(ano, mes - 1, 1));
  const dia = data.getUTCDay();
  const deslocamento = (8 - (dia === 0 ? 7 : dia)) % 7;
  data.setUTCDate(data.getUTCDate() + deslocamento);
  return isoDeUtc(data);
}

function rotuloDaData(iso: string) {
  const data = dataUtc(iso);
  const semana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(data);
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes} · ${semana.charAt(0).toUpperCase()}${semana.slice(1)}`;
}

export function aplicarTrocas(plano: PlanoMensal, trocas: TrocaFolgaMensal[]) {
  if (trocas.length === 0) {
    return plano;
  }

  const indice = new Map(plano.dias.map((dia, posicao) => [dia.iso, posicao]));
  const linhas = plano.linhas.map((linha) => ({ ...linha, folgas: [...linha.folgas] }));
  const porId = new Map(linhas.map((linha) => [linha.id, linha]));

  for (const troca of trocas) {
    const origem = porId.get(troca.origemId);
    const destino = porId.get(troca.destinoId);
    const diaOrigem = indice.get(troca.origemIso);
    const diaDestino = indice.get(troca.destinoIso);

    if (origem && diaOrigem !== undefined) {
      origem.folgas[diaOrigem] = false;
    }
    if (origem && diaDestino !== undefined) {
      origem.folgas[diaDestino] = true;
    }
    if (destino && diaDestino !== undefined) {
      destino.folgas[diaDestino] = false;
    }
    if (destino && diaOrigem !== undefined) {
      destino.folgas[diaOrigem] = true;
    }
  }

  return { ...plano, linhas };
}

export async function listarTrocasFolga(): Promise<TrocaFolgaRegistrada[]> {
  await connection();
  await connectDB();
  const documentos = await TrocaFolgaMensalModel.find()
    .sort({ createdAt: 1 })
    .lean<
      {
        _id: { toString(): string };
        origemId: string;
        origemIso: string;
        destinoId: string;
        destinoIso: string;
        createdAt?: Date;
      }[]
    >();

  return documentos.flatMap((documento) => {
    if (
      !ISO.test(documento.origemIso) ||
      !ISO.test(documento.destinoIso) ||
      !documento.origemId ||
      !documento.destinoId
    ) {
      return [];
    }

    return [
      {
        id: documento._id.toString(),
        origemId: documento.origemId,
        origemIso: documento.origemIso,
        destinoId: documento.destinoId,
        destinoIso: documento.destinoIso,
        criadaEm: documento.createdAt
          ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
              documento.createdAt,
            )
          : "",
      },
    ];
  });
}

export function montarTrocasVisiveis(
  trocas: TrocaFolgaRegistrada[],
  pessoas: { id: string; nome: string; equipe: string }[],
  dias: Iterable<string>,
): TrocaVisivel[] {
  const noMes = new Set(dias);
  const porId = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));

  return trocas.flatMap((troca) => {
    if (!noMes.has(troca.origemIso) && !noMes.has(troca.destinoIso)) {
      return [];
    }

    const origem = porId.get(troca.origemId);
    const destino = porId.get(troca.destinoId);

    return [
      {
        id: troca.id,
        origemId: troca.origemId,
        origemNome: origem?.nome ?? "Colaborador removido",
        origemEquipe: origem?.equipe ?? "",
        origemIso: troca.origemIso,
        origemRotulo: rotuloDaData(troca.origemIso),
        destinoId: troca.destinoId,
        destinoNome: destino?.nome ?? "Colaborador removido",
        destinoEquipe: destino?.equipe ?? "",
        destinoIso: troca.destinoIso,
        destinoRotulo: rotuloDaData(troca.destinoIso),
        registradaEm: troca.criadaEm,
      },
    ];
  });
}

async function planoDoMes(iso: string, trocas: TrocaFolgaMensal[]) {
  const [colaboradores, config] = await Promise.all([
    listarColaboradores(),
    obterConfiguracao(),
  ]);
  const data = dataUtc(iso);
  const inicio = primeiraSegunda(data.getUTCFullYear(), data.getUTCMonth() + 1);
  const grade = montarGradeTrabalho(colaboradores, inicio, config.diasPrioridade);
  const gerado = gerarPlanoMensal({
    inicioSemana: grade.inicio,
    pessoas: grade.linhas,
    marcacoes: marcacoesDeDiasFolga(colaboradores),
    diasPrioridade: config.diasPrioridade,
    limitePrioridade: config.numFolgasPrioridade,
  });

  return aplicarTrocas(gerado.plano, trocas);
}

function estaDeFolga(plano: PlanoMensal, id: string, iso: string) {
  const linha = plano.linhas.find((item) => item.id === id);
  const indice = plano.dias.findIndex((dia) => dia.iso === iso);
  return Boolean(linha && indice >= 0 && linha.folgas[indice]);
}

export async function proximasFolgas(
  colaboradorId: string,
  depoisDe: string,
): Promise<DataFolga[]> {
  if (!colaboradorId || !ISO.test(depoisDe)) {
    return [];
  }

  const trocas = await listarTrocasFolga();
  const [ano, mes] = depoisDe.split("-").map(Number);
  const datas: DataFolga[] = [];

  for (let passo = 0; passo < 6 && datas.length < 5; passo += 1) {
    const referencia = new Date(Date.UTC(ano, mes - 1 + passo, 1));
    const plano = await planoDoMes(isoDeUtc(referencia), trocas);
    const linha = plano.linhas.find((item) => item.id === colaboradorId);
    if (!linha) {
      break;
    }

    plano.dias.forEach((dia, indice) => {
      if (datas.length >= 5 || dia.iso <= depoisDe || !linha.folgas[indice]) {
        return;
      }

      datas.push({ iso: dia.iso, rotulo: rotuloDaData(dia.iso) });
    });
  }

  return datas;
}

export async function registrarTrocaFolga(troca: TrocaFolgaMensal) {
  if (
    !ISO.test(troca.origemIso) ||
    !ISO.test(troca.destinoIso) ||
    !troca.origemId ||
    !troca.destinoId ||
    troca.origemId === troca.destinoId ||
    troca.origemIso === troca.destinoIso
  ) {
    return { error: "Escolha outro colaborador e outra data." };
  }

  const trocas = await listarTrocasFolga();
  const planoOrigem = await planoDoMes(troca.origemIso, trocas);
  const planoDestino =
    troca.origemIso.slice(0, 7) === troca.destinoIso.slice(0, 7)
      ? planoOrigem
      : await planoDoMes(troca.destinoIso, trocas);

  if (!estaDeFolga(planoOrigem, troca.origemId, troca.origemIso)) {
    return { error: "Essa folga não está mais disponível." };
  }

  if (!estaDeFolga(planoDestino, troca.destinoId, troca.destinoIso)) {
    return { error: "A folga escolhida não está mais disponível." };
  }

  await TrocaFolgaMensalModel.create(troca);
  return { ok: true as const };
}

export async function desfazerTrocaFolga(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    return { error: "Não foi possível desfazer essa troca." };
  }

  await connectDB();
  const removida = await TrocaFolgaMensalModel.findByIdAndDelete(id);
  if (!removida) {
    return { error: "Essa troca já foi desfeita." };
  }

  return { ok: true as const };
}
