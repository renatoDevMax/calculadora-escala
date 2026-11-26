import { connection } from "next/server";
import { isDiaSemana, type DiaSemana } from "@/lib/dias";
import { connectDB } from "@/lib/db";
import { ColaboradorModel } from "@/lib/models/colaborador";

export type Equipe = "1" | "2" | "3";
export type Genero = "homem" | "mulher";

export type DiasFolga = {
  diaFixo: DiaSemana;
  diaAlternado: DiaSemana;
};

export type Colaborador = {
  id: string;
  nome: string;
  equipe: Equipe;
  genero: Genero;
  diasFolga?: DiasFolga;
};

function isEquipe(value: string): value is Equipe {
  return value === "1" || value === "2" || value === "3";
}

export function generoDoColaborador(value: string | undefined): Genero {
  return value === "mulher" ? "mulher" : "homem";
}

function diasFolgaDoColaborador(value: unknown): DiasFolga | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const dias = value as { diaFixo?: unknown; diaAlternado?: unknown };
  const diaFixo = typeof dias.diaFixo === "string" ? dias.diaFixo : "";
  const diaAlternado = typeof dias.diaAlternado === "string" ? dias.diaAlternado : "";

  if (!isDiaSemana(diaFixo) || !isDiaSemana(diaAlternado)) {
    return undefined;
  }

  return { diaFixo, diaAlternado };
}

export async function listarColaboradores(): Promise<Colaborador[]> {
  await connection();
  await connectDB();
  const documentos = await ColaboradorModel.find()
    .sort({ nome: 1 })
    .lean<
      {
        _id: unknown;
        nome: string;
        equipe: string;
        genero?: string;
        diasFolga?: { diaFixo?: string; diaAlternado?: string };
      }[]
    >();

  return documentos.flatMap((documento) => {
    if (!isEquipe(documento.equipe)) {
      return [];
    }

    const diasFolga = diasFolgaDoColaborador(documento.diasFolga);

    return [
      {
        id: String(documento._id),
        nome: documento.nome,
        equipe: documento.equipe,
        genero: generoDoColaborador(documento.genero),
        ...(diasFolga ? { diasFolga } : {}),
      },
    ];
  });
}
