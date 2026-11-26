import { connection } from "next/server";
import { gerarPlanilhaDoPlano, linhasDeTrocas } from "@/lib/planilha-plano";
import { obterVistaEscala, semanaDaGrade } from "@/lib/vista-escala";

export async function GET(request: Request) {
  await connection();
  const semana = new URL(request.url).searchParams.get("semana") ?? undefined;
  const vista = await obterVistaEscala(semana, { comTrocas: true });

  if (!vista.plano) {
    return Response.json({ error: "Não foi possível montar a planilha." }, { status: 400 });
  }

  const arquivo = await gerarPlanilhaDoPlano(
    semanaDaGrade(vista.grade, vista.marcacoes),
    vista.plano,
    linhasDeTrocas(vista.trocas),
  );
  const mes = vista.plano.dias[0]?.iso.slice(0, 7) || "mensal";

  return new Response(arquivo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="escala-${mes}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
