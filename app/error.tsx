"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-10 text-center">
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Reintentar</Button>
    </div>
  );
}
