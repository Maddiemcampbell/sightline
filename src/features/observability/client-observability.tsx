"use client";

import { useEffect } from "react";
import { captureClientError } from "./client";

export function ClientObservability() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void captureClientError(event.error ?? new Error(event.message), {
        kind: "window_error",
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      void captureClientError(event.reason, { kind: "unhandled_rejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
