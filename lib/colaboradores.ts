import { connection } from "next/server";
import { connectDB } from "@/lib/db";
import { ColaboradorModel } from "@/lib/models/colaborador";

export type Equipe = "1" | "2" | "3";

export type Colaborador = {
  id: string;
  nome: string;
  equipe: Equipe;
};

function isEquipe(value: string): value is Equipe {
  return value === "1" || value === "2" || value === "3";
}

export async function listarColaboradores(): Promise<Colaborador[]> {
  await connection();
  await connectDB();
  const documentos = await ColaboradorModel.find()
    .sort({ nome: 1 })
    .lean<{ _id: unknown; nome: string; equipe: string }[]>();

  return documentos.flatMap((documento) => {
    if (!isEquipe(documento.equipe)) {
      return [];
    }

    return [
      {
        id: String(documento._id),
        nome: documento.nome,
        equipe: documento.equipe,
      },
    ];
  });
}
