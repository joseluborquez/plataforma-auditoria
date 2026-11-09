import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <ThemeToggle className="absolute right-4 top-4" />
      <form action={login} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">JLB Systems</p>
          <h1 className="text-xl font-semibold">Panel de auditorías</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {sp.error && <p className="text-sm text-destructive">Correo o contraseña incorrectos.</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </main>
  );
}
