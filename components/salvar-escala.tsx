"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { salvarEscala } from "@/app/actions/escala";

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-field disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar Escala"}
    </button>
  );
}

export function SalvarEscala() {
  const [state, action] = useActionState(salvarEscala, null);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <Botao />
      {state?.ok ? (
        <p className="text-sm text-muted">
          Escala salva. Ela permanece até o recálculo.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-sm font-medium text-foreground">{state.error}</p>
      ) : null}
    </form>
  );
}
