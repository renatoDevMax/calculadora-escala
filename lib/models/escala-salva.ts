import mongoose, { Schema } from "mongoose";
import { DIAS_SEMANA } from "@/lib/dias";

const participanteSchema = new Schema(
  {
    id: { type: String, required: true },
    nome: { type: String, required: true },
    equipe: { type: String, required: true, enum: ["1", "2", "3"], default: "1" },
    folgas: { type: [Boolean], required: true },
  },
  { _id: false },
);

const escalaSalvaSchema = new Schema(
  {
    chave: { type: String, required: true, unique: true },
    equipe: { type: String, required: true, enum: ["1", "2", "3"] },
    sequencial: { type: Boolean, required: true },
    numeroFolgas: { type: Number, required: true, min: 0 },
    numFolgasPrioridade: { type: Number, required: true, min: 0 },
    diasPrioridade: { type: [String], enum: DIAS_SEMANA, default: [] },
    participantes: { type: [participanteSchema], required: true },
  },
  { collection: "escalas" },
);

if (mongoose.models.EscalaSalva) {
  mongoose.deleteModel("EscalaSalva");
}

export const EscalaSalvaModel = mongoose.model(
  "EscalaSalva",
  escalaSalvaSchema,
);
