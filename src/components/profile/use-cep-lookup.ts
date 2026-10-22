"use client";

import { useEffect, useState } from "react";
import { digitsOnly } from "@/lib/profile/fields";

export type CepLookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; place: string }
  | { status: "not-found" };

type ViaCepResponse = {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

function describePlace(data: ViaCepResponse) {
  const city = [data.localidade, data.uf].filter(Boolean).join(" – ");
  return [data.logradouro, data.bairro, city].filter(Boolean).join(", ");
}

export function useCepLookup(postalCode: string): CepLookup {
  const cep = digitsOnly(postalCode);
  const [result, setResult] = useState<{ cep: string; lookup: CepLookup }>({ cep: "", lookup: { status: "idle" } });

  useEffect(() => {
    if (cep.length !== 8) return;
    const controller = new AbortController();
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<ViaCepResponse>) : Promise.reject()))
      .then((data) => {
        const place = data.erro ? "" : describePlace(data);
        setResult({ cep, lookup: place ? { status: "found", place } : { status: "not-found" } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ cep, lookup: { status: "idle" } });
      });
    return () => controller.abort();
  }, [cep]);

  if (cep.length !== 8) return { status: "idle" };
  return result.cep === cep ? result.lookup : { status: "loading" };
}
