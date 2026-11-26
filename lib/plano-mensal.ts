import type { Equipe, Genero } from "@/lib/colaboradores";
import { DIAS_SEMANA, type DiaSemana } from "@/lib/dias";

export type TipoFolga = "fixa" | "alternada";

export type MarcacoesPlano = Record<string, Partial<Record<number, TipoFolga>>>;

export function marcacoesDeDiasFolga(
  pessoas: { id: string; diasFolga?: { diaFixo: DiaSemana; diaAlternado: DiaSemana } }[],
): MarcacoesPlano {
  const marcacoes: MarcacoesPlano = {};

  for (const pessoa of pessoas) {
    if (!pessoa.diasFolga) {
      continue;
    }

    const fixo = DIAS_SEMANA.indexOf(pessoa.diasFolga.diaFixo);
    const alternado = DIAS_SEMANA.indexOf(pessoa.diasFolga.diaAlternado);
    if (fixo < 0 || fixo > 5 || alternado < 0 || alternado > 5 || fixo === alternado) {
      continue;
    }

    marcacoes[pessoa.id] = {
      [fixo]: "fixa",
      [alternado]: "alternada",
    };
  }

  return marcacoes;
}

export type PessoaPlano = {
  id: string;
  nome: string;
  equipe: Equipe;
  genero: Genero;
};

export type PlanoMensal = {
  titulo: string;
  limitePrioridade: number;
  dias: {
    iso: string;
    rotulo: string;
    prioridade: boolean;
    domingo: boolean;
  }[];
  linhas: {
    id: string;
    nome: string;
    equipe: Equipe;
    genero: Genero;
    folgas: boolean[];
  }[];
};

type DiaMes = {
  iso: string;
  rotulo: string;
  indiceSemana: number;
  prioridade: boolean;
  domingo: boolean;
  ordinalDomingo: number | null;
};

const EQUIPES: Equipe[] = ["1", "2", "3"];
const DIAS_UTEIS = [0, 1, 2, 3, 4, 5];

function dataUtc(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function isoDeUtc(data: Date) {
  return data.toISOString().slice(0, 10);
}

function domingoDaSemana(iso: string) {
  const data = dataUtc(iso);
  data.setUTCDate(data.getUTCDate() - data.getUTCDay());
  return isoDeUtc(data);
}

function indiceDaData(iso: string) {
  const dia = dataUtc(iso).getUTCDay();
  return dia === 0 ? 6 : dia - 1;
}

function clonarMarcacoes(marcacoes: MarcacoesPlano): MarcacoesPlano {
  return Object.fromEntries(
    Object.entries(marcacoes).map(([id, dias]) => [id, { ...dias }]),
  );
}

function diaDoTipo(marcacoes: MarcacoesPlano, id: string, tipo: TipoFolga) {
  const dias = marcacoes[id];
  if (!dias) {
    return undefined;
  }

  const encontrado = Object.entries(dias).find(([, valor]) => valor === tipo);
  return encontrado ? Number(encontrado[0]) : undefined;
}

function diaMaisLivre(
  opcoes: number[],
  nota: (dia: number) => number,
  proibido?: number,
) {
  const livres = opcoes.filter((dia) => dia !== proibido);
  if (livres.length === 0) {
    return undefined;
  }

  return [...livres].sort((a, b) => nota(a) - nota(b) || a - b)[0];
}

function completarMarcacoes(
  pessoas: PessoaPlano[],
  marcacoes: MarcacoesPlano,
  prioridade: Set<number>,
  limite: number,
) {
  const completo = clonarMarcacoes(marcacoes);
  const diasFixa = DIAS_UTEIS.filter((dia) => !prioridade.has(dia));
  const baseFixa = diasFixa.length > 0 ? diasFixa : DIAS_UTEIS;

  for (const equipe of EQUIPES) {
    const grupo = pessoas
      .filter((pessoa) => pessoa.equipe === equipe)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const fixas = Array.from({ length: 7 }, () => 0);
    const alternadas = Array.from({ length: 7 }, () => 0);

    for (const pessoa of grupo) {
      const fixa = diaDoTipo(completo, pessoa.id, "fixa");
      const alternada = diaDoTipo(completo, pessoa.id, "alternada");
      if (fixa !== undefined) {
        fixas[fixa] += 1;
      }
      if (alternada !== undefined) {
        alternadas[alternada] += 1;
      }
    }

    for (const pessoa of grupo) {
      if (diaDoTipo(completo, pessoa.id, "fixa") !== undefined) {
        continue;
      }

      const alternada = diaDoTipo(completo, pessoa.id, "alternada");
      const dia =
        diaMaisLivre(baseFixa, (opcao) => fixas[opcao], alternada) ??
        diaMaisLivre(
          DIAS_UTEIS,
          (opcao) => fixas[opcao] + (prioridade.has(opcao) ? 100 : 0),
          alternada,
        );
      if (dia === undefined) {
        continue;
      }

      completo[pessoa.id] = { ...completo[pessoa.id], [dia]: "fixa" };
      fixas[dia] += 1;
    }

    for (const pessoa of grupo) {
      if (diaDoTipo(completo, pessoa.id, "alternada") !== undefined) {
        continue;
      }

      const fixa = diaDoTipo(completo, pessoa.id, "fixa");
      const dia = diaMaisLivre(
        DIAS_UTEIS,
        (opcao) => {
          const cheio =
            prioridade.has(opcao) && fixas[opcao] + alternadas[opcao] >= limite ? 1000 : 0;
          return cheio + alternadas[opcao];
        },
        fixa,
      );
      if (dia === undefined) {
        continue;
      }

      completo[pessoa.id] = { ...completo[pessoa.id], [dia]: "alternada" };
      alternadas[dia] += 1;
    }
  }

  return completo;
}

const DOMINGO_EPOCA = Date.UTC(2020, 0, 5);

function modulo(valor: number, base: number) {
  return ((valor % base) + base) % base;
}

function indiceDaSemanaAbsoluto(domingoIso: string) {
  return Math.round((dataUtc(domingoIso).getTime() - DOMINGO_EPOCA) / (7 * 86_400_000));
}

function folgaNoDomingo(genero: Genero, fase: number, indiceSemana: number) {
  const ciclo = genero === "mulher" ? 2 : 4;
  return modulo(indiceSemana, ciclo) === fase;
}

function atribuirFases(
  grupo: PessoaPlano[],
  marcacoes: MarcacoesPlano,
  prioridade: Set<number>,
  limite: number,
) {
  const ordenados = [...grupo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const fases = new Map<string, number>();
  let homens = 0;
  let mulheres = 0;

  for (const pessoa of ordenados) {
    if (pessoa.genero === "mulher") {
      fases.set(pessoa.id, mulheres % 2);
      mulheres += 1;
    } else {
      fases.set(pessoa.id, homens % 4);
      homens += 1;
    }
  }

  const excesso = () => {
    if (prioridade.size === 0) {
      return 0;
    }

    let total = 0;
    for (let semana = 0; semana < 4; semana += 1) {
      for (const dia of prioridade) {
        let folgas = 0;
        for (const pessoa of ordenados) {
          const domingo = folgaNoDomingo(pessoa.genero, fases.get(pessoa.id) ?? 0, semana);
          const fixa = diaDoTipo(marcacoes, pessoa.id, "fixa");
          const alternada = diaDoTipo(marcacoes, pessoa.id, "alternada");
          if (dia === 6 ? domingo : dia === fixa || (dia === alternada && !domingo)) {
            folgas += 1;
          }
        }
        if (folgas > limite) {
          total += folgas - limite;
        }
      }
    }
    return total;
  };

  for (let volta = 0; volta < 4; volta += 1) {
    let mudou = false;

    for (const pessoa of ordenados) {
      const vigente = fases.get(pessoa.id) ?? 0;
      const opcoes = pessoa.genero === "mulher" ? [0, 1] : [0, 1, 2, 3];
      let melhor = vigente;
      let melhorNota = excesso();

      for (const candidato of opcoes) {
        if (candidato === vigente) {
          continue;
        }

        fases.set(pessoa.id, candidato);
        const nota = excesso();
        if (nota < melhorNota) {
          melhorNota = nota;
          melhor = candidato;
          mudou = true;
        }
      }

      fases.set(pessoa.id, melhor);
    }

    if (!mudou) {
      break;
    }
  }

  return fases;
}

function folgaNaData(
  pessoa: PessoaPlano,
  iso: string,
  marcacoes: MarcacoesPlano,
  fases: Map<string, number>,
) {
  const indice = indiceDaData(iso);
  const domingo = folgaNoDomingo(
    pessoa.genero,
    fases.get(pessoa.id) ?? 0,
    indiceDaSemanaAbsoluto(domingoDaSemana(iso)),
  );
  const fixa = diaDoTipo(marcacoes, pessoa.id, "fixa");
  const alternada = diaDoTipo(marcacoes, pessoa.id, "alternada");

  if (indice === 6) {
    return domingo;
  }

  if (indice === fixa) {
    return true;
  }

  if (indice === alternada) {
    return !domingo;
  }

  return false;
}

function montarDias(inicioSemana: string, prioridade: Set<string>) {
  const [ano, mes] = inicioSemana.split("-").map(Number);
  const quantidade = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const previa = Array.from({ length: quantidade }, (_, indice) => {
    const dia = indice + 1;
    const iso = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const indiceSemana = indiceDaData(iso);
    const nome = DIAS_SEMANA[indiceSemana];
    return {
      iso,
      rotulo: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`,
      indiceSemana,
      prioridade: prioridade.has(nome),
      domingo: nome === "Domingo",
      semana: domingoDaSemana(iso),
    };
  });
  const ordinalPorSemana = new Map<string, number | null>();
  let ordinal = 0;
  for (const dia of previa) {
    if (ordinalPorSemana.has(dia.semana)) {
      continue;
    }

    const existe = previa.some((item) => item.iso === dia.semana);
    ordinalPorSemana.set(dia.semana, existe ? ordinal : null);
    if (existe) {
      ordinal += 1;
    }
  }

  const dias: DiaMes[] = previa.map((dia) => ({
    ...dia,
    ordinalDomingo: ordinalPorSemana.get(dia.semana) ?? null,
  }));
  const tituloBase = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dataUtc(dias[0]?.iso ?? inicioSemana));

  return {
    titulo: tituloBase.charAt(0).toUpperCase() + tituloBase.slice(1),
    dias,
  };
}

export function gerarPlanoMensal(entrada: {
  inicioSemana: string;
  pessoas: PessoaPlano[];
  marcacoes: MarcacoesPlano;
  diasPrioridade: readonly DiaSemana[];
  limitePrioridade: number;
}): { marcacoes: MarcacoesPlano; plano: PlanoMensal } {
  const prioridadeIndice = new Set(
    entrada.diasPrioridade.map((dia) => DIAS_SEMANA.indexOf(dia)).filter((indice) => indice >= 0),
  );
  const limite = Math.max(0, entrada.limitePrioridade);
  const marcacoes = completarMarcacoes(
    entrada.pessoas,
    entrada.marcacoes,
    prioridadeIndice,
    limite,
  );
  const { titulo, dias } = montarDias(entrada.inicioSemana, new Set(entrada.diasPrioridade));
  const fases = new Map<string, number>();

  for (const equipe of EQUIPES) {
    const grupo = entrada.pessoas.filter((pessoa) => pessoa.equipe === equipe);
    for (const [id, fase] of atribuirFases(grupo, marcacoes, prioridadeIndice, limite)) {
      fases.set(id, fase);
    }
  }

  return {
    marcacoes,
    plano: {
      titulo,
      limitePrioridade: limite,
      dias: dias.map((dia) => ({
        iso: dia.iso,
        rotulo: dia.rotulo,
        prioridade: dia.prioridade,
        domingo: dia.domingo,
      })),
      linhas: entrada.pessoas.map((pessoa) => ({
        id: pessoa.id,
        nome: pessoa.nome,
        equipe: pessoa.equipe,
        genero: pessoa.genero,
        folgas: dias.map((dia) => folgaNaData(pessoa, dia.iso, marcacoes, fases)),
      })),
    },
  };
}
