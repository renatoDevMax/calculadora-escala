import mongoose, { Schema } from "mongoose";

const trocaFolgaMensalSchema = new Schema(
  {
    origemId: { type: String, required: true },
    origemIso: { type: String, required: true },
    destinoId: { type: String, required: true },
    destinoIso: { type: String, required: true },
  },
  { collection: "trocas-folga", timestamps: true },
);

if (mongoose.models.TrocaFolgaMensal) {
  mongoose.deleteModel("TrocaFolgaMensal");
}

export const TrocaFolgaMensalModel = mongoose.model(
  "TrocaFolgaMensal",
  trocaFolgaMensalSchema,
);
