import mongoose, { Schema } from "mongoose";
import { DIAS_SEMANA } from "@/lib/dias";

const EQUIPES = ["1", "2", "3"] as const;
const GENEROS = ["homem", "mulher"] as const;

const diasFolgaSchema = new Schema(
  {
    diaFixo: { type: String, required: true, enum: DIAS_SEMANA },
    diaAlternado: { type: String, required: true, enum: DIAS_SEMANA },
  },
  { _id: false },
);

const colaboradorSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    equipe: { type: String, required: true, enum: EQUIPES },
    genero: { type: String, enum: GENEROS, default: "homem" },
    diasFolga: { type: diasFolgaSchema, required: false },
  },
  { collection: "colaboradores" },
);

if (mongoose.models.Colaborador) {
  mongoose.deleteModel("Colaborador");
}

export const ColaboradorModel = mongoose.model(
  "Colaborador",
  colaboradorSchema,
);
