import { listarColaboradores } from "@/lib/colaboradores";
import { obterConfiguracao } from "@/lib/configuracao";
import { montarGradeTrabalho, semanasDosMesesVizinhos, type GradeTrabalho } from "@/lib/escala";
import { gerarPlanoMensal, marcacoesDeDiasFolga, type MarcacoesPlano, type PlanoMensal } from "@/lib/plano-mensal";
import { obterPlanoMensal } from "@/lib/plano-mensal-salvo";
import type { PlanilhaSemana } from "@/lib/planilha-plano";
import {
  aplicarTrocas,
  listarTrocasFolga,
  montarTrocasVisiveis,
  type TrocaVisivel,
} from "@/lib/trocas-mensais";

export function tituloDoMes(iso: string) {
  const [ano, mes] = iso.split("-").map(Number);
  const titulo = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));

  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

export function semanaDaGrade(grade: GradeTrabalho, marcacoes: MarcacoesPlano): PlanilhaSemana {
  return {
    titulo: grade.titulo,
    dias: grade.dias.map((dia) => ({
      nome: dia.nome,
      rotulo: dia.rotulo,
      prioridade: dia.prioridade,
      domingo: dia.nome === "Domingo",
    })),
    linhas: grade.linhas.map((linha) => ({
      nome: linha.nome,
      equipe: linha.equipe,
      celulas: grade.dias.map((dia) => {
        if (dia.nome === "Domingo") {
          return "Trabalho";
        }

        const tipo = marcacoes[linha.id]?.[dia.indice];
        if (tipo === "fixa") {
          return "Fixa";
        }

        if (tipo === "alternada") {
          return "Alternada";
        }

        return "Trabalho";
      }),
    })),
  };
}

export async function obterVistaEscala(
  semana?: string,
  opcoes?: { comTrocas?: boolean },
): Promise<{
  grade: GradeTrabalho;
  meses: { anterior: string; proximo: string };
  marcacoes: MarcacoesPlano;
  plano: PlanoMensal | null;
  aviso: string | null;
  limitePrioridade: number;
  trocas: TrocaVisivel[];
}> {
  const [colaboradores, config] = await Promise.all([
    listarColaboradores(),
    obterConfiguracao(),
  ]);
  const grade = montarGradeTrabalho(colaboradores, semana, config.diasPrioridade);
  const meses = semanasDosMesesVizinhos(grade.inicio);
  let marcacoes = marcacoesDeDiasFolga(colaboradores);
  let plano: PlanoMensal | null = null;
  let aviso: string | null = null;

  if (colaboradores.some((pessoa) => pessoa.diasFolga)) {
    const gerado = gerarPlanoMensal({
      inicioSemana: grade.inicio,
      pessoas: grade.linhas,
      marcacoes,
      diasPrioridade: config.diasPrioridade,
      limitePrioridade: config.numFolgasPrioridade,
    });
    marcacoes = gerado.marcacoes;
    plano = gerado.plano;
    aviso = "Este mês segue as folgas definidas.";
  } else {
    plano = await obterPlanoMensal(grade.inicio.slice(0, 7));
    aviso = plano ? "Esta é a escala salva." : null;
  }

  let trocas: TrocaVisivel[] = [];
  if (plano && opcoes?.comTrocas) {
    const registradas = await listarTrocasFolga();
    plano = aplicarTrocas(plano, registradas);
    trocas = montarTrocasVisiveis(
      registradas,
      colaboradores.map((pessoa) => ({
        id: pessoa.id,
        nome: pessoa.nome,
        equipe: pessoa.equipe,
      })),
      plano.dias.map((dia) => dia.iso),
    );
  }

  return {
    grade,
    meses,
    marcacoes,
    plano,
    aviso,
    limitePrioridade: config.numFolgasPrioridade,
    trocas,
  };
}
