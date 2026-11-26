"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/escala", label: "Escala" },
  { href: "/configuracao", label: "Configuração" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-line bg-sidebar text-foreground md:min-h-screen md:w-64 md:border-r md:border-b-0">
      <div className="px-5 py-5">
        <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
          Chirolira
        </p>
        <p className="mt-1 text-lg font-semibold">Sistema de Escala</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-6">
        {ITENS.map((item) => {
          const ativo =
            item.href === "/escala"
              ? pathname === "/escala" || pathname === "/gerar-escala"
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                ativo
                  ? "bg-field text-foreground"
                  : "text-muted hover:bg-field hover:text-foreground"
              }`}
              aria-current={ativo ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
