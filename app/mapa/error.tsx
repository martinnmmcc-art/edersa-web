"use client";

import { useEffect } from "react";

export default function ErrorMapa({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[error boundary /mapa]", error);
  }, [error]);

  return (
    <div className="h-dvh w-full flex items-center justify-center bg-panel p-6">
      <div className="max-w-sm text-center flex flex-col gap-4">
        <h1 className="font-display text-2xl text-slate-100">Se cortó algo en el mapa</h1>
        <p className="text-sm text-slate-400">
          Pasó un error inesperado. El detalle quedó en la consola del
          navegador (útil para reportarlo). Podés intentar de nuevo sin
          perder la sesión.
        </p>
        <p className="text-xs text-slate-600 break-words bg-panel-raised rounded-lg p-3">
          {error.message || "Error sin mensaje"}
        </p>
        <button
          onClick={reset}
          className="h-touch rounded-xl bg-acento text-panel font-display text-xl"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
