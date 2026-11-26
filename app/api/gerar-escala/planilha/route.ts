import type { Equipe } from "@/lib/colaboradores";
import { gerarPlanilhaDoPlano, type PlanilhaSemana } from "@/lib/planilha-plano";
import type { PlanoMensal } from "@/lib/plano-mensal";

function equipeValida(value: unknown): value is Equipe {
  return value === "1" || value === "2" || value === "3";
}

function lerSemana(value: unknown): PlanilhaSemana | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const semana = value as PlanilhaSemana;
  if (typeof semana.titulo !== "string" || !Array.isArray(semana.dias) || !Array.isArray(semana.linhas)) {
    return null;
  }

  if (semana.dias.length !== 7) {
    return null;
  }

  const diasOk = semana.dias.every(
    (dia) => typeof dia?.nome === "string" && typeof dia.rotulo === "string",
  );
  const linhasOk = semana.linhas.every(
    (linha) =>
      typeof linha?.nome === "string" &&
      equipeValida(linha.equipe) &&
      Array.isArray(linha.celulas) &&
      linha.celulas.length === 7 &&
      linha.celulas.every((celula) => typeof celula === "string"),
  );

  if (!diasOk || !linhasOk) {
    return null;
  }

  return semana;
}

function lerPlano(value: unknown): PlanoMensal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const plano = value as PlanoMensal;
  if (
    typeof plano.titulo !== "string" ||
    typeof plano.limitePrioridade !== "number" ||
    !Array.isArray(plano.dias) ||
    !Array.isArray(plano.linhas) ||
    plano.dias.length === 0
  ) {
    return null;
  }

  const diasOk = plano.dias.every(
    (dia) => typeof dia?.iso === "string" && typeof dia.rotulo === "string",
  );
  const linhasOk = plano.linhas.every(
    (linha) =>
      typeof linha?.nome === "string" &&
      equipeValida(linha.equipe) &&
      (linha.genero === "homem" || linha.genero === "mulher") &&
      Array.isArray(linha.folgas) &&
      linha.folgas.length === plano.dias.length,
  );

  if (!diasOk || !linhasOk) {
    return null;
  }

  return plano;
}

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as {
    semana?: unknown;
    plano?: unknown;
  } | null;
  const semana = lerSemana(corpo?.semana);
  const plano = lerPlano(corpo?.plano);

  if (!semana || !plano) {
    return Response.json({ error: "Não foi possível montar a planilha." }, { status: 400 });
  }

  const arquivo = await gerarPlanilhaDoPlano(semana, plano);
  const mes = plano.dias[0]?.iso.slice(0, 7) || "mensal";

  return new Response(arquivo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="escala-${mes}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
