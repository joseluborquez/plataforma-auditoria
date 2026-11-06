import { SubmitButton } from "@/components/submit-button";

/** Eliminación con confirmación sin JavaScript: <details> que muestra el botón final. */
export function ConfirmDelete({ action, label = "Eliminar", what }: { action: () => Promise<void>; label?: string; what?: string }) {
  return (
    <details className="inline-block text-sm">
      <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-destructive">{label}</summary>
      <form action={action} className="mt-1 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
        <span className="text-xs">¿Eliminar{what ? ` ${what}` : ""}? No se puede deshacer.</span>
        <SubmitButton variant="destructive" size="xs">Confirmar</SubmitButton>
      </form>
    </details>
  );
}
