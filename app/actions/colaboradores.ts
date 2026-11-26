"use server";

import { refresh } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ColaboradorModel } from "@/lib/models/colaborador";
import { generoDoColaborador, type Equipe } from "@/lib/colaboradores";

export type FormState = {
  error?: string;
  ok?: boolean;
} | null;

function lerEquipe(value: FormDataEntryValue | null): Equipe | null {
  if (value === "1" || value === "2" || value === "3") {
    return value;
  }

  return null;
}

function lerColaborador(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const equipe = lerEquipe(formData.get("equipe"));

  if (!nome) {
    return { error: "Informe o nome do colaborador." } as const;
  }

  if (nome.length > 120) {
    return { error: "O nome pode ter no máximo 120 caracteres." } as const;
  }

  if (!equipe) {
    return { error: "Selecione a equipe 1, 2 ou 3." } as const;
  }

  return {
    nome,
    equipe,
    genero: generoDoColaborador(String(formData.get("genero") ?? "")),
  } as const;
}

export async function criarColaborador(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const dados = lerColaborador(formData);

  if ("error" in dados) {
    return { error: dados.error };
  }

  await connectDB();
  await ColaboradorModel.create({
    nome: dados.nome,
    equipe: dados.equipe,
    genero: dados.genero,
  });
  refresh();

  return { ok: true };
}

export async function atualizarColaborador(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Colaborador inválido." };
  }

  const dados = lerColaborador(formData);

  if ("error" in dados) {
    return { error: dados.error };
  }

  await connectDB();
  const atualizado = await ColaboradorModel.findByIdAndUpdate(id, {
    nome: dados.nome,
    equipe: dados.equipe,
    genero: dados.genero,
  });

  if (!atualizado) {
    return { error: "Colaborador não encontrado." };
  }

  refresh();
  return { ok: true };
}

export async function excluirColaborador(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return;
  }

  await connectDB();
  await ColaboradorModel.findByIdAndDelete(id);
  refresh();
}
