import ExcelJS from "exceljs";
import type { EscalaSemana } from "@/lib/escala";

const FOLGA = "FFE7EBF0";
const TRABALHO = "FFD5E3F4";
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
    views: [{ state: "frozen", ySplit: 4, xSplit: 1 }],
  });
  const colunas = escala.dias.length + 1;

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
  resumo.value = escala.diasPrioridade.length
    ? `Equipe 1 · Semana ${escala.semanaDoCiclo} de ${escala.ciclo} · Prioridade: ${prioridade} · ${quantidade} de folga`
    : `Equipe 1 · Semana ${escala.semanaDoCiclo} de ${escala.ciclo} · Sem dia de prioridade`;
  resumo.font = { color: { argb: "FF5C6572" } };

  const cabecalho = planilha.getRow(4);
  cabecalho.height = 48;
  const funcionario = cabecalho.getCell(1);
  funcionario.value = "Funcionário";
  funcionario.font = { bold: true };
  funcionario.alignment = { vertical: "middle" };
  pintar(funcionario, CABECALHO);

  escala.dias.forEach((dia, indice) => {
    const celula = cabecalho.getCell(indice + 2);
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

    linha.folgas.forEach((folga, dia) => {
      const celula = linhaPlanilha.getCell(dia + 2);
      celula.value = folga ? "Folga" : "Trabalho";
      celula.alignment = { horizontal: "center", vertical: "middle" };
      pintar(celula, folga ? FOLGA : TRABALHO);
    });
  });

  const totais = planilha.getRow(5 + escala.linhas.length);
  const rotuloTotal = totais.getCell(1);
  rotuloTotal.value = "Folgas no dia";
  rotuloTotal.font = { bold: true };
  escala.folgasNoDia.forEach((quantidadeDia, dia) => {
    const celula = totais.getCell(dia + 2);
    celula.value = quantidadeDia;
    celula.font = { bold: true };
    celula.alignment = { horizontal: "center" };
  });

  planilha.getColumn(1).width = 24;
  for (let coluna = 2; coluna <= colunas; coluna += 1) {
    planilha.getColumn(coluna).width = 16;
  }

  const conteudo = await pasta.xlsx.writeBuffer();
  return conteudo instanceof Uint8Array
    ? conteudo
    : new Uint8Array(conteudo);
}
