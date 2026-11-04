import { connection } from "next/server";
import { obterEscalaDaSemana } from "@/lib/escala-salva";
import { gerarPlanilha } from "@/lib/planilha";

export async function GET(request: Request) {
  await connection();
  const semana = new URL(request.url).searchParams.get("semana") ?? undefined;
  const { escala } = await obterEscalaDaSemana(semana);
  const arquivo = await gerarPlanilha(escala);

  return new Response(arquivo, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="escala-${escala.inicio}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
