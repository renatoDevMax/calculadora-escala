import { connection } from "next/server";
import mongoose from "mongoose";
import type { DiasFolga } from "@/lib/colaboradores";
import { DIAS_SEMANA, isDiaSemana, type DiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import { ColaboradorModel } from "@/lib/models/colaborador";
import { PlanoMensalModel } from "@/lib/models/plano-mensal";
import type { MarcacoesPlano, PlanoMensal } from "@/lib/plano-mensal";

type PlanoDoc = {
  titulo: string;
  limitePrioridade: number;
  dias?: PlanoMensal["dias"];
  linhas?: PlanoMensal["linhas"];
};

function mesDaChave(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : "";
}

function planoValido(plano: PlanoMensal) {
  if (!plano.dias.length || plano.dias.length > 31) {
    return false;
  }

  const mes = mesDaChave(plano.dias[0]?.iso ?? "");
  if (!mes) {
    return false;
  }

  return plano.dias.every(
    (dia) => mesDaChave(dia.iso) === mes && /^\d{2}\/\d{2}$/.test(dia.rotulo),
  );
}

export function mesDoPlano(plano: PlanoMensal) {
  return mesDaChave(plano.dias[0]?.iso ?? "");
}

export function diasFolgaDasMarcacoes(
  ids: string[],
  marcacoes: MarcacoesPlano,
): { id: string; diasFolga: DiasFolga }[] | null {
  const lista: { id: string; diasFolga: DiasFolga }[] = [];

  for (const id of ids) {
    const dias = marcacoes[id] ?? {};
    const fixo = Object.entries(dias).find(([, tipo]) => tipo === "fixa");
    const alternado = Object.entries(dias).find(([, tipo]) => tipo === "alternada");
    const diaFixo = fixo ? DIAS_SEMANA[Number(fixo[0])] : undefined;
    const diaAlternado = alternado ? DIAS_SEMANA[Number(alternado[0])] : undefined;

    if (!diaFixo || !diaAlternado || !isDiaSemana(diaFixo) || !isDiaSemana(diaAlternado)) {
      return null;
    }

    if (diaFixo === "Domingo" || diaAlternado === "Domingo" || diaFixo === diaAlternado) {
      return null;
    }

    lista.push({ id, diasFolga: { diaFixo, diaAlternado } });
  }

  return lista;
}

export async function obterPlanoMensal(mes: string): Promise<PlanoMensal | null> {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return null;
  }

  await connection();
  await connectDB();
  const documento = await PlanoMensalModel.findOne({ chave: mes }).lean<PlanoDoc | null>();

  if (!documento || !documento.dias?.length || !documento.linhas) {
    return null;
  }

  const dias = documento.dias.filter(
    (dia) => mesDaChave(dia.iso) === mes && typeof dia.rotulo === "string",
  );
  if (dias.length !== documento.dias.length) {
    return null;
  }

  return {
    titulo: documento.titulo,
    limitePrioridade: documento.limitePrioridade ?? 0,
    dias,
    linhas: documento.linhas.flatMap((linha) => {
      if (!Array.isArray(linha.folgas) || linha.folgas.length !== dias.length) {
        return [];
      }

      if (linha.equipe !== "1" && linha.equipe !== "2" && linha.equipe !== "3") {
        return [];
      }

      return [
        {
          id: linha.id,
          nome: linha.nome,
          equipe: linha.equipe,
          genero: linha.genero === "mulher" ? "mulher" : "homem",
          folgas: linha.folgas.map((folga) => folga === true),
        },
      ];
    }),
  };
}

export async function salvarPlanoNoBanco(
  plano: PlanoMensal,
  diasFolga: { id: string; diasFolga: DiasFolga }[],
  diasPrioridade: DiaSemana[],
) {
  if (!planoValido(plano)) {
    return { error: "O plano mensal está incompleto." } as const;
  }

  const mes = mesDoPlano(plano);
  const linhasValidas = plano.linhas.every(
    (linha) =>
      mongoose.Types.ObjectId.isValid(linha.id) && linha.folgas.length === plano.dias.length,
  );
  const pessoasValidas = diasFolga.every((pessoa) =>
    mongoose.Types.ObjectId.isValid(pessoa.id),
  );

  if (!linhasValidas || !pessoasValidas || diasFolga.length !== plano.linhas.length) {
    return { error: "Não foi possível salvar os dias de folga dos colaboradores." } as const;
  }

  await connection();
  await connectDB();
  await PlanoMensalModel.findOneAndUpdate(
    { chave: mes },
    {
      chave: mes,
      titulo: plano.titulo,
      limitePrioridade: plano.limitePrioridade,
      diasPrioridade,
      dias: plano.dias,
      linhas: plano.linhas,
    },
    { upsert: true, new: true },
  );

  if (diasFolga.length > 0) {
    await ColaboradorModel.bulkWrite(
      diasFolga.map((pessoa) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(pessoa.id) },
          update: { $set: { diasFolga: pessoa.diasFolga } },
        },
      })),
    );
  }

  return { ok: true as const };
}
