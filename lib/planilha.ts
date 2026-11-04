import ExcelJS from "exceljs";
import type { EscalaSemana } from "@/lib/escala";

const FOLGA = "FFE7EBF0";
const TRABALHO: Record<"1" | "2" | "3", string> = {
  "1": "FFD5E3F4",
  "2": "FFD5EADC",
  "3": "FFF3E0CF",
};
const CABECALHO = "FFE3E7EE";

function juntarDias(dias: string[]) {
  if (dias.length === 0) {
    return "nenhum dia";
  }

  if (dias.length === 1) {
    return dias[0];
  }

  return `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}`;
}

function pintar(celula: ExcelJS.Cell, cor: string) {
  celula.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: cor },
  };
}

export async function gerarPlanilha(escala: EscalaSemana) {
  const pasta = new ExcelJS.Workbook();
  pasta.creator = "Sistema de Escala";
  const planilha = pasta.addWorksheet("Escala", {
    views: [{ state: "frozen", ySplit: 4, xSplit: 2 }],
  });
  const colunas = escala.dias.length + 2;

  planilha.mergeCells(1, 1, 1, colunas);
  const titulo = planilha.getCell(1, 1);
  titulo.value = `Escala · ${escala.titulo}`;
  titulo.font = { bold: true, size: 16, color: { argb: "FF1C2128" } };

  planilha.mergeCells(2, 1, 2, colunas);
  const resumo = planilha.getCell(2, 1);
  const prioridade = juntarDias(escala.diasPrioridade);
  const quantidade =
    escala.numFolgasPrioridade === 1
      ? "1 pessoa"
      : `${escala.numFolgasPrioridade} pessoas`;
  const ciclos = escala.ciclos
    .map((ciclo) => `equipe ${ciclo.equipe}: semana ${ciclo.semana} de ${ciclo.tamanho}`)
    .join(" · ");
  resumo.value = escala.diasPrioridade.length
    ? `Equipes 1, 2 e 3 · ${ciclos} · Prioridade: ${prioridade} · ${quantidade} de folga por equipe`
    : `Equipes 1, 2 e 3 · ${ciclos} · Sem dia de prioridade`;
  resumo.font = { color: { argb: "FF5C6572" } };

  const cabecalho = planilha.getRow(4);
  cabecalho.height = 48;
  const funcionario = cabecalho.getCell(1);
  funcionario.value = "Funcionário";
  funcionario.font = { bold: true };
  funcionario.alignment = { vertical: "middle" };
  pintar(funcionario, CABECALHO);
  const colunaEquipe = cabecalho.getCell(2);
  colunaEquipe.value = "Equipe";
  colunaEquipe.font = { bold: true };
  colunaEquipe.alignment = { horizontal: "center", vertical: "middle" };
  pintar(colunaEquipe, CABECALHO);

  escala.dias.forEach((dia, indice) => {
    const celula = cabecalho.getCell(indice + 3);
    celula.value = dia.prioridade
      ? `${dia.nome}\n${dia.rotulo}\nPrioridade`
      : `${dia.nome}\n${dia.rotulo}`;
    celula.font = { bold: true };
    celula.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    pintar(celula, CABECALHO);
  });

  escala.linhas.forEach((linha, indice) => {
    const linhaPlanilha = planilha.getRow(5 + indice);
    linhaPlanilha.getCell(1).value = linha.nome;
    linhaPlanilha.getCell(1).alignment = { vertical: "middle" };
    const equipe = linhaPlanilha.getCell(2);
    equipe.value = linha.equipe;
    equipe.alignment = { horizontal: "center", vertical: "middle" };

    linha.folgas.forEach((folga, dia) => {
      const celula = linhaPlanilha.getCell(dia + 3);
      celula.value = folga ? "Folga" : "Trabalho";
      celula.alignment = { horizontal: "center", vertical: "middle" };
      pintar(celula, folga ? FOLGA : TRABALHO[linha.equipe]);
    });
  });

  const totais = planilha.getRow(5 + escala.linhas.length);
  const rotuloTotal = totais.getCell(1);
  rotuloTotal.value = "Folgas no dia";
  rotuloTotal.font = { bold: true };
  totais.getCell(2).value = "1 · 2 · 3";
  escala.folgasNoDia.forEach((quantidadeDia, dia) => {
    const celula = totais.getCell(dia + 3);
    const porEquipe = `${escala.folgasPorEquipe["1"][dia]} · ${escala.folgasPorEquipe["2"][dia]} · ${escala.folgasPorEquipe["3"][dia]}`;
    celula.value = `${quantidadeDia}\n${porEquipe}`;
    celula.alignment = { horizontal: "center", wrapText: true };
    celula.font = { bold: true };
  });

  planilha.getColumn(1).width = 24;
  planilha.getColumn(2).width = 12;
  for (let coluna = 3; coluna <= colunas; coluna += 1) {
    planilha.getColumn(coluna).width = 16;
  }

  const conteudo = await pasta.xlsx.writeBuffer();
  return conteudo instanceof Uint8Array
    ? conteudo
    : new Uint8Array(conteudo);
}
