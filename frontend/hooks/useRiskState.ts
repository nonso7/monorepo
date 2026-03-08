"use client";

import { useEffect, useState } from "react";
import { getRiskState } from "@/lib/risk";

interface UseRiskStateResult {
  isFrozen: boolean;
  freezeReason: string | null;
  isLoading: boolean;
  clearFreeze: () => void;
}

export function useRiskState(): UseRiskStateResult {
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRiskState() {
      try {
        const risk = await getRiskState();
        if (!cancelled) {
          setIsFrozen(risk.isFrozen);
         setFreezeReason(risk.freezeReason || "Account restricted due to negative balance");
        }
      }
      catch (e) {
        console.error(e)
      }

      finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRiskState();

    return () => {
      cancelled = true;
    };
  }, []);

  function clearFreeze() {
    setIsFrozen(false);
    setFreezeReason(null);
  }

  return { isFrozen, freezeReason, isLoading, clearFreeze };
}