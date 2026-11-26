import ExcelJS from "exceljs";
import type { Equipe } from "@/lib/colaboradores";
import type { PlanoMensal } from "@/lib/plano-mensal";
import type { TrocaVisivel } from "@/lib/trocas-mensais";

const FIXA = "FFE7EBF0";
const ALTERNADA = "FFEFE4C4";
const PRIORIDADE = "FFD5DEEA";
const DOMINGO = "FFF8E4E4";
const CABECALHO = "FFE3E7EE";
const TRABALHO: Record<Equipe, string> = {
  "1": "FFD5E3F4",
  "2": "FFD5EADC",
  "3": "FFF3E0CF",
};

export type PlanilhaSemana = {
  titulo: string;
  dias: { nome: string; rotulo: string; prioridade: boolean; domingo: boolean }[];
  linhas: { nome: string; equipe: Equipe; celulas: string[] }[];
};

function pintar(celula: ExcelJS.Cell, cor: string) {
  celula.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: cor },
  };
}

function corDaCelula(valor: string, equipe: Equipe) {
  if (valor === "Folga" || valor === "Fixa") {
    return FIXA;
  }

  if (valor === "Alternada") {
    return ALTERNADA;
  }

  return TRABALHO[equipe];
}

function escreverTabela(
  planilha: ExcelJS.Worksheet,
  titulo: string,
  cabecalhos: { texto: string; prioridade: boolean; domingo: boolean }[],
  linhas: { nome: string; equipe: Equipe; celulas: string[] }[],
) {
  const colunas = cabecalhos.length + 2;
  planilha.mergeCells(1, 1, 1, colunas);
  const tituloCelula = planilha.getCell(1, 1);
  tituloCelula.value = titulo;
  tituloCelula.font = { bold: true, size: 16, color: { argb: "FF1C2128" } };

  const cabecalho = planilha.getRow(3);
  cabecalho.height = 32;
  const funcionario = cabecalho.getCell(1);
  funcionario.value = "Funcionário";
  funcionario.font = { bold: true };
  pintar(funcionario, CABECALHO);
  const equipe = cabecalho.getCell(2);
  equipe.value = "Equipe";
  equipe.font = { bold: true };
  equipe.alignment = { horizontal: "center" };
  pintar(equipe, CABECALHO);

  cabecalhos.forEach((dia, indice) => {
    const celula = cabecalho.getCell(indice + 3);
    celula.value = dia.texto;
    celula.font = { bold: true };
    celula.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    pintar(celula, dia.domingo ? DOMINGO : dia.prioridade ? PRIORIDADE : CABECALHO);
  });

  linhas.forEach((linha, indice) => {
    const linhaPlanilha = planilha.getRow(4 + indice);
    linhaPlanilha.getCell(1).value = linha.nome;
    const colunaEquipe = linhaPlanilha.getCell(2);
    colunaEquipe.value = linha.equipe;
    colunaEquipe.alignment = { horizontal: "center" };
    linha.celulas.forEach((valor, dia) => {
      const celula = linhaPlanilha.getCell(dia + 3);
      celula.value = valor;
      celula.alignment = { horizontal: "center" };
      pintar(celula, corDaCelula(valor, linha.equipe));
    });
  });

  planilha.getColumn(1).width = 28;
  planilha.getColumn(2).width = 12;
  for (let coluna = 3; coluna <= colunas; coluna += 1) {
    planilha.getColumn(coluna).width = 14;
  }
  planilha.views = [{ state: "frozen", ySplit: 3, xSplit: 2 }];
}

export type LinhaTrocaPlanilha = {
  colaborador: string;
  equipe: string;
  cedeu: string;
  recebeu: string;
  colega: string;
  equipeColega: string;
  registradaEm: string;
};

export function linhasDeTrocas(trocas: TrocaVisivel[]): LinhaTrocaPlanilha[] {
  return trocas.flatMap((troca) => [
    {
      colaborador: troca.origemNome,
      equipe: troca.origemEquipe,
      cedeu: troca.origemRotulo,
      recebeu: troca.destinoRotulo,
      colega: troca.destinoNome,
      equipeColega: troca.destinoEquipe,
      registradaEm: troca.registradaEm,
    },
    {
      colaborador: troca.destinoNome,
      equipe: troca.destinoEquipe,
      cedeu: troca.destinoRotulo,
      recebeu: troca.origemRotulo,
      colega: troca.origemNome,
      equipeColega: troca.origemEquipe,
      registradaEm: troca.registradaEm,
    },
  ]);
}

function escreverTrocas(planilha: ExcelJS.Worksheet, titulo: string, linhas: LinhaTrocaPlanilha[]) {
  const cabecalhos = [
    "Colaborador",
    "Equipe",
    "Cedeu a folga",
    "Passou a folgar",
    "Trocou com",
    "Equipe do colega",
    "Registrada em",
  ];

  planilha.mergeCells(1, 1, 1, cabecalhos.length);
  const tituloCelula = planilha.getCell(1, 1);
  tituloCelula.value = titulo;
  tituloCelula.font = { bold: true, size: 16, color: { argb: "FF1C2128" } };

  planilha.mergeCells(2, 1, 2, cabecalhos.length);
  const nota = planilha.getCell(2, 1);
  nota.value = "Vale só para as datas desta troca. A folga fixa e a alternada continuam nos outros dias.";
  nota.font = { italic: true, color: { argb: "FF5C6570" } };

  const cabecalho = planilha.getRow(4);
  cabecalho.height = 24;
  cabecalhos.forEach((texto, indice) => {
    const celula = cabecalho.getCell(indice + 1);
    celula.value = texto;
    celula.font = { bold: true };
    pintar(celula, CABECALHO);
  });

  if (linhas.length === 0) {
    planilha.mergeCells(5, 1, 5, cabecalhos.length);
    planilha.getCell(5, 1).value = "Nenhuma troca neste mês.";
  } else {
    linhas.forEach((linha, indice) => {
      const linhaPlanilha = planilha.getRow(5 + indice);
      const valores = [
        linha.colaborador,
        linha.equipe,
        linha.cedeu,
        linha.recebeu,
        linha.colega,
        linha.equipeColega,
        linha.registradaEm,
      ];
      valores.forEach((valor, coluna) => {
        const celula = linhaPlanilha.getCell(coluna + 1);
        celula.value = valor;
        if (coluna === 1 || coluna === 5) {
          celula.alignment = { horizontal: "center" };
        }
      });
    });
  }

  const larguras = [28, 12, 28, 28, 28, 18, 16];
  larguras.forEach((largura, indice) => {
    planilha.getColumn(indice + 1).width = largura;
  });
  planilha.views = [{ state: "frozen", ySplit: 4 }];
}

export async function gerarPlanilhaDoPlano(
  semana: PlanilhaSemana,
  plano: PlanoMensal,
  trocas?: LinhaTrocaPlanilha[],
) {
  const pasta = new ExcelJS.Workbook();
  pasta.creator = "Sistema de Escala";
  const folhaSemana = pasta.addWorksheet("Semana");
  escreverTabela(
    folhaSemana,
    `Semana · ${semana.titulo}`,
    semana.dias.map((dia) => ({
      texto: dia.prioridade ? `${dia.nome}\n${dia.rotulo}\nPrioridade` : `${dia.nome}\n${dia.rotulo}`,
      prioridade: dia.prioridade,
      domingo: dia.domingo,
    })),
    semana.linhas,
  );

  const folhaMes = pasta.addWorksheet("Mês");
  escreverTabela(
    folhaMes,
    plano.titulo,
    plano.dias.map((dia) => ({
      texto: dia.rotulo,
      prioridade: dia.prioridade,
      domingo: dia.domingo,
    })),
    plano.linhas.map((linha) => ({
      nome: linha.nome,
      equipe: linha.equipe,
      celulas: linha.folgas.map((folga) => (folga ? "Folga" : "Trabalho")),
    })),
  );

  if (trocas) {
    const folhaTrocas = pasta.addWorksheet("Trocas");
    escreverTrocas(folhaTrocas, `Trocas · ${plano.titulo}`, trocas);
  }

  const conteudo = await pasta.xlsx.writeBuffer();
  return conteudo instanceof Uint8Array ? conteudo : new Uint8Array(conteudo);
}
