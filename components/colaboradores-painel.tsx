"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  atualizarColaborador,
  criarColaborador,
  excluirColaborador,
  type FormState,
} from "@/app/actions/colaboradores";
import type { Colaborador } from "@/lib/colaboradores";

const EQUIPES = ["1", "2", "3"] as const;

function BotaoSalvar({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}

function BotaoExcluir() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium text-foreground hover:bg-field disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}

function CampoNome({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <input
      name="nome"
      defaultValue={defaultValue}
      required
      maxLength={120}
      placeholder="Nome"
      className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm outline-none focus:border-ink"
    />
  );
}

function CampoEquipe({ defaultValue = "1" }: { defaultValue?: string }) {
  return (
    <select
      name="equipe"
      defaultValue={defaultValue}
      className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm outline-none focus:border-ink"
    >
      {EQUIPES.map((equipe) => (
        <option key={equipe} value={equipe}>
          Equipe {equipe}
        </option>
      ))}
    </select>
  );
}

function FormularioNovo() {
  const [state, action] = useActionState(criarColaborador, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-2xl border border-line bg-panel p-4"
    >
      <h2 className="text-sm font-semibold">Novo colaborador</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-center">
        <CampoNome />
        <CampoEquipe />
        <BotaoSalvar>Adicionar</BotaoSalvar>
      </div>
      {state?.error ? (
        <p className="mt-3 text-sm font-medium text-foreground">{state.error}</p>
      ) : null}
    </form>
  );
}

function FormularioEdicao({
  colaborador,
  onCancelar,
}: {
  colaborador: Colaborador;
  onCancelar: () => void;
}) {
  const action = atualizarColaborador.bind(null, colaborador.id);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      onCancelar();
    }
  }, [state, onCancelar]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_160px_auto_auto] sm:items-center">
      <CampoNome defaultValue={colaborador.nome} />
      <CampoEquipe defaultValue={colaborador.equipe} />
      <BotaoSalvar>Salvar</BotaoSalvar>
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-field"
      >
        Cancelar
      </button>
      {state?.error ? (
        <p className="text-sm font-medium text-foreground sm:col-span-4">{state.error}</p>
      ) : null}
    </form>
  );
}

export function ColaboradoresPainel({
  colaboradores,
}: {
  colaboradores: Colaborador[];
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <FormularioNovo />
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        {colaboradores.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nenhum colaborador cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {colaboradores.map((colaborador) => (
              <li key={colaborador.id} className="px-4 py-3">
                {editandoId === colaborador.id ? (
                  <FormularioEdicao
                    colaborador={colaborador}
                    onCancelar={() => setEditandoId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{colaborador.nome}</p>
                      <p className="text-sm text-muted">
                        Equipe {colaborador.equipe}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditandoId(colaborador.id)}
                        className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field"
                      >
                        Editar
                      </button>
                      <form
                        action={excluirColaborador.bind(null, colaborador.id)}
                        onSubmit={(event) => {
                          const confirmado = window.confirm(
                            `Excluir ${colaborador.nome}?`,
                          );
                          if (!confirmado) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <BotaoExcluir />
                      </form>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
