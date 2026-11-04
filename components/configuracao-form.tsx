"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { salvarConfiguracao } from "@/app/actions/configuracao";
import { DIAS_SEMANA, type DiaSemana } from "@/lib/dias";
import type { Configuracao } from "@/lib/configuracao";

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar configuração"}
    </button>
  );
}

export function ConfiguracaoForm({ config }: { config: Configuracao }) {
  const [state, action] = useActionState(salvarConfiguracao, null);
  const [tempoIntervalo, setTempoIntervalo] = useState(
    String(config.tempoIntervalo),
  );
  const [folgaSequencia, setFolgaSequencia] = useState(config.folgaSequencia);
  const [diasPrioridade, setDiasPrioridade] = useState<DiaSemana[]>(
    config.diasPrioridade,
  );
  const [jornadaHorasDiaria, setJornadaHorasDiaria] = useState(
    String(config.jornadaHorasDiaria),
  );
  const [numeroFolgas, setNumeroFolgas] = useState(String(config.numeroFolgas));
  const [numFolgasPrioridade, setNumFolgasPrioridade] = useState(
    String(config.numFolgasPrioridade),
  );

  function alternarDia(dia: DiaSemana) {
    setDiasPrioridade((atual) =>
      atual.includes(dia)
        ? atual.filter((item) => item !== dia)
        : DIAS_SEMANA.filter((item) => atual.includes(item) || item === dia),
    );
  }

  return (
    <form action={action} className="space-y-6 rounded-2xl border border-line bg-panel p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Tempo de intervalo
          <input
            name="tempoIntervalo"
            type="number"
            min={0}
            step="1"
            required
            value={tempoIntervalo}
            onChange={(event) => setTempoIntervalo(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 font-normal outline-none focus:border-ink"
          />
        </label>
        <label className="block text-sm font-medium">
          Jornada diária (horas)
          <input
            name="jornadaHorasDiaria"
            type="number"
            min={0}
            step="0.5"
            required
            value={jornadaHorasDiaria}
            onChange={(event) => setJornadaHorasDiaria(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 font-normal outline-none focus:border-ink"
          />
        </label>
        <label className="block text-sm font-medium">
          Número de folgas
          <input
            name="numeroFolgas"
            type="number"
            min={0}
            step="1"
            required
            value={numeroFolgas}
            onChange={(event) => setNumeroFolgas(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 font-normal outline-none focus:border-ink"
          />
        </label>
        <label className="flex items-end gap-3 pb-2 text-sm font-medium">
          <input
            name="folgaSequencia"
            type="checkbox"
            checked={folgaSequencia}
            onChange={(event) => setFolgaSequencia(event.target.checked)}
            className="size-4 accent-ink"
          />
          Folgas em sequência
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Dias de prioridade</legend>
        <p className="mt-1 text-sm text-muted">
          Selecione um ou mais dias da semana. Nesses dias, cada equipe fica
          com a quantidade de pessoas de folga indicada abaixo.
        </p>
        <label className="mt-4 block max-w-xs text-sm font-medium">
          Pessoas de folga por equipe
          <input
            name="numFolgasPrioridade"
            type="number"
            min={0}
            step="1"
            required
            value={numFolgasPrioridade}
            onChange={(event) => setNumFolgasPrioridade(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-line bg-field px-3 font-normal outline-none focus:border-ink"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DIAS_SEMANA.map((dia) => {
            const marcado = diasPrioridade.includes(dia);

            return (
              <label
                key={dia}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  marcado
                    ? "border-ink bg-field"
                    : "border-line bg-panel"
                }`}
              >
                <input
                  type="checkbox"
                  name="diasPrioridade"
                  value={dia}
                  checked={marcado}
                  onChange={() => alternarDia(dia)}
                  className="size-4 accent-ink"
                />
                {dia}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BotaoSalvar />
        {state?.ok ? (
          <p className="text-sm font-medium text-foreground">Configuração salva.</p>
        ) : null}
        {state?.error ? (
          <p className="text-sm font-medium text-foreground">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
