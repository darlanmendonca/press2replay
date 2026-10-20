"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

type Properties = Record<string, string | number | boolean | null>;

// Dispara um evento de analytics uma vez quando a pagina abre. Existe para as
// paginas de servidor, que nao podem chamar track() diretamente.
export function TrackOnMount({ event, properties }: { event: string; properties?: Properties }) {
  const key = JSON.stringify(properties);
  useEffect(() => {
    track(event, key ? (JSON.parse(key) as Properties) : undefined);
  }, [event, key]);
  return null;
}
