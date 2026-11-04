"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const configuracaoPendente = error.message.startsWith("Defina MONGO_URL");
  const mensagem = configuracaoPendente
    ? "A conexão com o MongoDB ainda não está pronta. Abra o arquivo .env.local e troque <db_password> pela senha do cluster."
    : "Não foi possível falar com o banco de dados. Confira a MONGO_URL e tente de novo.";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <div className="rounded-2xl border border-line bg-panel px-5 py-8">
        <h1 className="text-lg font-semibold">Banco de dados indisponível</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          {mensagem}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-panel"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
