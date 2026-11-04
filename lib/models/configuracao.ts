import mongoose, { Schema } from "mongoose";
import { DIAS_SEMANA } from "@/lib/dias";

const configuracaoSchema = new Schema(
  {
    chave: { type: String, required: true, unique: true },
    tempoIntervalo: { type: Number, required: true, min: 0 },
    folgaSequencia: { type: Boolean, required: true },
    diasPrioridade: {
      type: [String],
      enum: DIAS_SEMANA,
      default: [],
    },
    jornadaHorasDiaria: { type: Number, required: true, min: 0 },
    numeroFolgas: { type: Number, required: true, min: 0 },
    numFolgasPrioridade: { type: Number, required: true, min: 0, default: 0 },
  },
  { collection: "config" },
);

if (mongoose.models.Configuracao) {
  mongoose.deleteModel("Configuracao");
}

export const ConfiguracaoModel = mongoose.model(
  "Configuracao",
  configuracaoSchema,
);
