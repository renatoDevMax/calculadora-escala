import mongoose, { Schema } from "mongoose";
import { DIAS_SEMANA } from "@/lib/dias";

const diaSchema = new Schema(
  {
    iso: { type: String, required: true },
    rotulo: { type: String, required: true },
    prioridade: { type: Boolean, required: true },
    domingo: { type: Boolean, required: true },
  },
  { _id: false },
);

const linhaSchema = new Schema(
  {
    id: { type: String, required: true },
    nome: { type: String, required: true },
    equipe: { type: String, required: true, enum: ["1", "2", "3"] },
    genero: { type: String, required: true, enum: ["homem", "mulher"] },
    folgas: { type: [Boolean], required: true },
  },
  { _id: false },
);

const planoMensalSchema = new Schema(
  {
    chave: { type: String, required: true, unique: true },
    titulo: { type: String, required: true },
    limitePrioridade: { type: Number, required: true, min: 0 },
    diasPrioridade: { type: [String], enum: DIAS_SEMANA, default: [] },
    dias: { type: [diaSchema], required: true },
    linhas: { type: [linhaSchema], required: true },
  },
  { collection: "planos-mensais" },
);

if (mongoose.models.PlanoMensal) {
  mongoose.deleteModel("PlanoMensal");
}

export const PlanoMensalModel = mongoose.model("PlanoMensal", planoMensalSchema);
