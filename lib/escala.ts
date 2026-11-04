import type { Colaborador, Equipe } from "@/lib/colaboradores";
import type { Configuracao } from "@/lib/configuracao";
import { DIAS_SEMANA, type DiaSemana } from "@/lib/dias";

const TOTAL_DIAS = 7;

export type DiaCalendario = {
  indice: number;
  nome: DiaSemana;
  iso: string;
  rotulo: string;
  prioridade: boolean;
  hoje: boolean;
};

export type LinhaCalendario = {
  id: string;
  nome: string;
  equipe: Equipe;
  folgas: boolean[];
  posicaoCiclo: number;
};

export type EscalaSemana = {
  inicio: string;
  fim: string;
  titulo: string;
  anterior: string;
  proxima: string;
  semanaAtual: boolean;
  sequencial: boolean;
  numeroFolgas: number;
  numFolgasPrioridade: number;
  diasPrioridade: DiaSemana[];
  dias: DiaCalendario[];
  linhas: LinhaCalendario[];
  folgasNoDia: number[];
  folgasPorEquipe: Record<Equipe, number[]>;
  ciclo: number;
  semanaDoCiclo: number;
  ciclos: { equipe: Equipe; tamanho: number; semana: number }[];
};

function dataUtc(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function isoDeUtc(data: Date) {
  return data.toISOString().slice(0, 10);
}

function isoValido(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return false;
  }

  const data = dataUtc(iso);
  return isoDeUtc(data) === iso;
}

export function hojeEmSaoPaulo(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function segundaDaSemana(iso: string) {
  const data = dataUtc(iso);
  const dia = data.getUTCDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  data.setUTCDate(data.getUTCDate() + deslocamento);
  return isoDeUtc(data);
}

function somarDias(iso: string, dias: number) {
  const data = dataUtc(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return isoDeUtc(data);
}

function indiceDaSemana(segunda: string) {
  return Math.floor(dataUtc(segunda).getTime() / (7 * 86_400_000));
}

function numeroDoNome(nome: string) {
  const encontrado = nome.match(/(\d+)/);
  return encontrado ? Number(encontrado[1]) : Number.MAX_SAFE_INTEGER;
}

function diasContiguos(dias: number[]) {
  if (dias.length <= 1) {
    return true;
  }

  const ordenados = [...dias].sort((a, b) => a - b);

  return ordenados.every(
    (dia, indice) => indice === 0 || dia === ordenados[indice - 1] + 1,
  );
}

function combinar(quantidade: number) {
  const resultado: number[][] = [];

  function percorrer(inicio: number, atual: number[]) {
    if (atual.length === quantidade) {
      resultado.push([...atual]);
      return;
    }

    for (let dia = inicio; dia < TOTAL_DIAS; dia += 1) {
      atual.push(dia);
      percorrer(dia + 1, atual);
      atual.pop();
    }
  }

  percorrer(0, []);
  return resultado;
}

function candidatosDeFolga(quantidade: number, sequencial: boolean) {
  if (quantidade <= 0) {
    return [[]];
  }

  if (quantidade >= TOTAL_DIAS) {
    return [[0, 1, 2, 3, 4, 5, 6]];
  }

  if (sequencial) {
    return Array.from({ length: TOTAL_DIAS - quantidade + 1 }, (_, inicio) =>
      Array.from({ length: quantidade }, (_, deslocamento) => inicio + deslocamento),
    );
  }

  const soltos = combinar(quantidade).filter((padrao) => !diasContiguos(padrao));
  return soltos.length > 0 ? soltos : combinar(quantidade);
}

function espalharVagas(
  alvos: number[],
  vagas: number,
  dias: number[],
  teto: number,
) {
  let restante = vagas;

  while (restante > 0) {
    const disponiveis = dias.filter((dia) => alvos[dia] < teto);

    if (disponiveis.length === 0) {
      break;
    }

    const menor = Math.min(...disponiveis.map((dia) => alvos[dia]));
    let avancou = false;

    for (const dia of disponiveis) {
      if (restante === 0) {
        break;
      }

      if (alvos[dia] === menor) {
        alvos[dia] += 1;
        restante -= 1;
        avancou = true;
      }
    }

    if (!avancou) {
      break;
    }
  }
}

function separarDiasAltos(alvos: number[], dias: number[]) {
  if (dias.length < 3) {
    return;
  }

  const maximo = Math.max(...dias.map((dia) => alvos[dia]));
  const minimo = Math.min(...dias.map((dia) => alvos[dia]));

  if (maximo !== minimo + 1) {
    return;
  }

  const altos = dias.filter((dia) => alvos[dia] === maximo).sort((a, b) => a - b);
  const baixos = dias.filter((dia) => alvos[dia] === minimo);

  if (altos.length !== 2 || baixos.length !== 1 || altos[1] - altos[0] !== 1) {
    return;
  }

  alvos[altos[1]] -= 1;
  alvos[baixos[0]] += 1;
}

function alvosDaEquipe(
  pessoas: number,
  folgas: number,
  prioridade: number[],
  limite: number,
  deslocamento: number,
) {
  const alvos = Array(TOTAL_DIAS).fill(0);
  const vagas = pessoas * folgas;

  if (vagas === 0) {
    return alvos;
  }

  const ordem = Array.from(
    { length: TOTAL_DIAS },
    (_, indice) => (deslocamento + indice) % TOTAL_DIAS,
  );
  const teto = Math.min(Math.max(limite, 0), pessoas);
  const outros = ordem.filter((dia) => !prioridade.includes(dia));

  if (prioridade.length === 0) {
    espalharVagas(alvos, vagas, ordem, pessoas);
    return alvos;
  }

  const pedido = teto * prioridade.length;

  if (pedido <= vagas) {
    for (const dia of prioridade) {
      alvos[dia] = teto;
    }

    if (outros.length === 0) {
      espalharVagas(alvos, vagas - pedido, ordem, pessoas);
    } else {
      espalharVagas(alvos, vagas - pedido, outros, pessoas);
      separarDiasAltos(alvos, outros);
    }
  } else {
    espalharVagas(alvos, vagas, prioridade, teto);
  }

  return alvos;
}

function melhorQue(atual: number[], candidato: number[]) {
  for (let indice = 0; indice < candidato.length; indice += 1) {
    if (candidato[indice] !== atual[indice]) {
      return candidato[indice] < atual[indice];
    }
  }

  return false;
}

function escolherPadrao(
  candidatos: number[][],
  restante: number[],
  cursor: number,
  prioridade: number[],
) {
  let escolhido = candidatos[0] ?? [];
  let melhor = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];

  for (const padrao of candidatos) {
    let estouroPrioridade = 0;
    let estouro = 0;
    let distancia = 0;

    for (const dia of padrao) {
      if (restante[dia] <= 0) {
        estouro += 1;

        if (prioridade.includes(dia)) {
          estouroPrioridade += 1;
        }
      }

      distancia += (dia - cursor + TOTAL_DIAS) % TOTAL_DIAS;
    }

    const chave = [estouroPrioridade, estouro, distancia];

    if (melhorQue(melhor, chave)) {
      melhor = chave;
      escolhido = padrao;
    }
  }

  return escolhido;
}


function ajustarParaAlvos(grade: boolean[][], alvos: number[]) {
  for (let volta = 0; volta < grade.length * TOTAL_DIAS; volta += 1) {
    const atual = Array(TOTAL_DIAS).fill(0);

    for (const linha of grade) {
      linha.forEach((folga, dia) => {
        if (folga) {
          atual[dia] += 1;
        }
      });
    }

    let origem = -1;
    let destino = -1;

    for (let dia = 0; dia < TOTAL_DIAS; dia += 1) {
      if (
        atual[dia] > alvos[dia] &&
        (origem < 0 || atual[dia] - alvos[dia] > atual[origem] - alvos[origem])
      ) {
        origem = dia;
      }

      if (
        atual[dia] < alvos[dia] &&
        (destino < 0 || alvos[dia] - atual[dia] > alvos[destino] - atual[destino])
      ) {
        destino = dia;
      }
    }

    if (origem < 0 || destino < 0) {
      return;
    }

    let moveu = false;

    for (const linha of grade) {
      if (!linha[origem] || linha[destino]) {
        continue;
      }

      const dias: number[] = [];

      for (let dia = 0; dia < TOTAL_DIAS; dia += 1) {
        if (dia === origem) {
          continue;
        }

        if (dia === destino || linha[dia]) {
          dias.push(dia);
        }
      }

      if (dias.length > 1 && diasContiguos(dias)) {
        continue;
      }

      linha[origem] = false;
      linha[destino] = true;
      moveu = true;
      break;
    }

    if (!moveu) {
      return;
    }
  }
}

function custoOcupacao(
  ocupacao: number[],
  alvos: number[],
  prioridade: number[],
) {
  let erroPrioridade = 0;
  let erroRestante = 0;

  for (let dia = 0; dia < TOTAL_DIAS; dia += 1) {
    const erro = (ocupacao[dia] - alvos[dia]) ** 2;

    if (prioridade.includes(dia)) {
      erroPrioridade += erro;
    } else {
      erroRestante += erro;
    }
  }

  return [erroPrioridade, erroRestante];
}

function filaDeJanelas(
  pessoas: number,
  folgas: number,
  prioridade: number[],
  limite: number,
  deslocamento: number,
  alvos: number[],
) {
  const janelas = candidatosDeFolga(folgas, true);
  const usos = Array(janelas.length).fill(0);
  let melhorUsos = Array(janelas.length).fill(0);
  let melhorCusto = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];

  function avaliar() {
    const ocupacao = Array(TOTAL_DIAS).fill(0);

    janelas.forEach((janela, indice) => {
      for (const dia of janela) {
        ocupacao[dia] += usos[indice];
      }
    });

    if (prioridade.some((dia) => ocupacao[dia] > limite)) {
      return;
    }

    const custo = custoOcupacao(ocupacao, alvos, prioridade);

    if (melhorQue(melhorCusto, custo)) {
      melhorCusto = custo;
      melhorUsos = [...usos];
    }
  }

  function buscar(indice: number, restam: number) {
    if (indice === janelas.length - 1) {
      usos[indice] = restam;
      avaliar();
      return;
    }

    for (let quantidade = 0; quantidade <= restam; quantidade += 1) {
      usos[indice] = quantidade;
      buscar(indice + 1, restam - quantidade);
    }
  }

  if (janelas.length <= 1) {
    usos[0] = pessoas;
    avaliar();
  } else {
    buscar(0, pessoas);
  }

  const fila: number[][] = [];
  const restantes = [...melhorUsos];
  let cursor = janelas.length === 0 ? 0 : deslocamento % janelas.length;
  let guard = 0;

  while (fila.length < pessoas && guard < pessoas * Math.max(janelas.length, 1)) {
    if (restantes[cursor] > 0) {
      fila.push(janelas[cursor]);
      restantes[cursor] -= 1;
    }

    cursor = (cursor + 1) % janelas.length;
    guard += 1;
  }

  return fila;
}

function folgasDaEquipe(
  pessoas: number,
  folgas: number,
  prioridade: number[],
  limite: number,
  sequencial: boolean,
  deslocamento: number,
) {
  const grade = Array.from({ length: pessoas }, () =>
    Array(TOTAL_DIAS).fill(false),
  );

  if (folgas <= 0 || pessoas === 0) {
    return grade;
  }

  if (sequencial) {
    const fila = filaDeJanelas(
      pessoas,
      folgas,
      prioridade,
      limite,
      deslocamento,
      alvosDaEquipe(pessoas, folgas, prioridade, limite, deslocamento),
    );

    fila.forEach((janela, pessoa) => {
      for (const dia of janela) {
        grade[pessoa][dia] = true;
      }
    });

    return grade;
  }

  const alvos = alvosDaEquipe(
    pessoas,
    folgas,
    prioridade,
    limite,
    deslocamento,
  );
  const restante = [...alvos];
  const candidatos = candidatosDeFolga(folgas, false);

  for (let pessoa = 0; pessoa < pessoas; pessoa += 1) {
    const padrao = escolherPadrao(
      candidatos,
      restante,
      (deslocamento + pessoa) % TOTAL_DIAS,
      prioridade,
    );

    for (const dia of padrao) {
      grade[pessoa][dia] = true;
      restante[dia] -= 1;
    }
  }

  ajustarParaAlvos(grade, alvos);
  return grade;
}

function tituloDaSemana(inicio: string, fim: string) {
  const completo = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const semAno = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const primeira = dataUtc(inicio);
  const ultima = dataUtc(fim);

  if (
    primeira.getUTCMonth() === ultima.getUTCMonth() &&
    primeira.getUTCFullYear() === ultima.getUTCFullYear()
  ) {
    return `${primeira.getUTCDate()} a ${completo.format(ultima)}`;
  }

  return `${semAno.format(primeira)} a ${completo.format(ultima)}`;
}

export type BaseEscala = {
  participantes: {
    id: string;
    nome: string;
    equipe: Equipe;
    folgas: boolean[];
  }[];
  sequencial: boolean;
  numeroFolgas: number;
  numFolgasPrioridade: number;
  diasPrioridade: DiaSemana[];
};

const EQUIPES: Equipe[] = ["1", "2", "3"];

export function criarBaseEscala(
  colaboradores: Colaborador[],
  config: Configuracao,
): BaseEscala {
  const quantidadeFolgas = Math.min(
    TOTAL_DIAS,
    Math.max(0, Math.floor(config.numeroFolgas)),
  );
  const limitePrioridade = Math.max(
    0,
    Math.floor(config.numFolgasPrioridade),
  );
  const diasPrioridade = config.diasPrioridade.map((dia) =>
    DIAS_SEMANA.indexOf(dia),
  );
  const participantes = EQUIPES.flatMap((equipe) => {
    const grupo = colaboradores
      .filter((colaborador) => colaborador.equipe === equipe)
      .sort(
        (a, b) =>
          numeroDoNome(a.nome) - numeroDoNome(b.nome) ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
    const grade = folgasDaEquipe(
      grupo.length,
      quantidadeFolgas,
      diasPrioridade,
      limitePrioridade,
      config.folgaSequencia,
      0,
    );

    return grupo.map((colaborador, indice) => ({
      id: colaborador.id,
      nome: colaborador.nome,
      equipe,
      folgas: [...(grade[indice] ?? Array(TOTAL_DIAS).fill(false))],
    }));
  });

  return {
    participantes,
    sequencial: config.folgaSequencia,
    numeroFolgas: quantidadeFolgas,
    numFolgasPrioridade: limitePrioridade,
    diasPrioridade: [...config.diasPrioridade],
  };
}

export function projetarEscala(
  base: BaseEscala,
  semana?: string,
  agora = new Date(),
): EscalaSemana {
  const hoje = hojeEmSaoPaulo(agora);
  const referencia =
    semana && isoValido(semana) ? semana : hoje;
  const inicio = segundaDaSemana(referencia);
  const fim = somarDias(inicio, 6);
  const atual = segundaDaSemana(hoje);
  const prioridade = new Set(
    base.diasPrioridade.map((dia) => DIAS_SEMANA.indexOf(dia)),
  );
  const giro = indiceDaSemana(inicio);
  const linhas: LinhaCalendario[] = [];
  const folgasPorEquipe = {
    "1": Array(TOTAL_DIAS).fill(0),
    "2": Array(TOTAL_DIAS).fill(0),
    "3": Array(TOTAL_DIAS).fill(0),
  } as Record<Equipe, number[]>;
  const ciclos = EQUIPES.flatMap((equipe) => {
    const grupo = base.participantes.filter(
      (participante) => participante.equipe === equipe,
    );
    const tamanho = grupo.length;

    if (tamanho === 0) {
      return [];
    }

    const semana = ((giro % tamanho) + tamanho) % tamanho;

    grupo.forEach((participante, pessoa) => {
      const posicao = (pessoa + semana) % tamanho;
      const origem = grupo[posicao];
      const folgas = Array.from({ length: TOTAL_DIAS }, (_, dia) =>
        Boolean(origem?.folgas[dia]),
      );

      folgas.forEach((folga, dia) => {
        if (folga) {
          folgasPorEquipe[equipe][dia] += 1;
        }
      });

      linhas.push({
        id: participante.id,
        nome: participante.nome,
        equipe,
        folgas,
        posicaoCiclo: posicao + 1,
      });
    });

    return [{ equipe, tamanho, semana: semana + 1 }];
  });
  const ciclo = ciclos[0]?.tamanho ?? 0;
  const semanaDoCiclo = ciclos[0]?.semana ?? 0;

  linhas.sort(
    (a, b) =>
      Number(a.equipe) - Number(b.equipe) ||
      numeroDoNome(a.nome) - numeroDoNome(b.nome) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const formatoMes = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  });

  return {
    inicio,
    fim,
    titulo: tituloDaSemana(inicio, fim),
    anterior: somarDias(inicio, -7),
    proxima: somarDias(inicio, 7),
    semanaAtual: inicio === atual,
    sequencial: base.sequencial,
    numeroFolgas: base.numeroFolgas,
    numFolgasPrioridade: base.numFolgasPrioridade,
    diasPrioridade: base.diasPrioridade,
    dias: DIAS_SEMANA.map((nome, indice) => {
      const iso = somarDias(inicio, indice);
      return {
        indice,
        nome,
        iso,
        rotulo: `${dataUtc(iso).getUTCDate()} ${formatoMes.format(dataUtc(iso)).replace(".", "")}`,
        prioridade: prioridade.has(indice),
        hoje: iso === hoje,
      };
    }),
    linhas,
    folgasNoDia: Array.from({ length: TOTAL_DIAS }, (_, dia) =>
      EQUIPES.reduce((total, equipe) => total + folgasPorEquipe[equipe][dia], 0),
    ),
    folgasPorEquipe,
    ciclo,
    semanaDoCiclo,
    ciclos,
  };
}

export function montarEscala(
  colaboradores: Colaborador[],
  config: Configuracao,
  semana?: string,
  agora = new Date(),
): EscalaSemana {
  return projetarEscala(criarBaseEscala(colaboradores, config), semana, agora);
}
