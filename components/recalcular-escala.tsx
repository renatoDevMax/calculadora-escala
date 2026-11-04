"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { recalcularEscala } from "@/app/actions/escala";

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel hover:bg-ink/90 disabled:opacity-60"
    >
      {pending ? "Recalculando..." : "Recalcular escala"}
    </button>
  );
}

export function RecalcularEscala() {
  const [state, action] = useActionState(recalcularEscala, null);
  const limite = state?.limite ?? 0;

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <Botao />
      {state?.ok ? (
        <p className="text-sm text-muted">
          Escala recalculada e salva. A anterior foi substituída. Nos dias de
          prioridade,{" "}
          {limite === 1 ? "1 pessoa folga" : `${limite} pessoas folgam`}.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-sm font-medium text-foreground">{state.error}</p>
      ) : null}
    </form>
  );
}
