export const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export function isDiaSemana(value: string): value is DiaSemana {
  return (DIAS_SEMANA as readonly string[]).includes(value);
}
