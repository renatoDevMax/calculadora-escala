import mongoose, { Schema } from "mongoose";

const EQUIPES = ["1", "2", "3"] as const;

const colaboradorSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    equipe: { type: String, required: true, enum: EQUIPES },
  },
  { collection: "colaboradores" },
);

export const ColaboradorModel =
  mongoose.models.Colaborador ||
  mongoose.model("Colaborador", colaboradorSchema);
