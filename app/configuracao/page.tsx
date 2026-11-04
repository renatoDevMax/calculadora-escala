import { Suspense } from "react";
import { ConfiguracaoForm } from "@/components/configuracao-form";
import { obterConfiguracao } from "@/lib/configuracao";

export const metadata = {
  title: "Configuração",
};

async function Formulario() {
  const config = await obterConfiguracao();
  return <ConfiguracaoForm config={config} />;
}

export default function ConfiguracaoPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Configuração</h1>
        <p className="mt-1 text-sm text-muted">
          Parâmetros usados para montar a escala. Existe um único conjunto
          salvo.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="rounded-2xl border border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            Carregando configuração...
          </p>
        }
      >
        <Formulario />
      </Suspense>
    </div>
  );
}
