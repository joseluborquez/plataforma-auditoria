# Panel interno de auditorías (JLB Systems)

Herramienta INTERNA (no SaaS). Usuario principal: el dueño. Segunda vista de solo lectura (`/reporte/[clientId]`) para la gerencia del cliente.

@AGENTS.md

## Stack
Next.js 16 (App Router, carpeta `app/` en la raíz, alias `@/*`), TypeScript, Tailwind v4, shadcn/ui, Supabase (Postgres + Auth + RLS). Despliegue en Vercel.
Esta versión de Next tiene cambios: `middleware` ahora es `proxy.ts`; `params`/`searchParams` son Promesas. Lee `node_modules/next/dist/docs/` ante dudas.

## Convenciones
- Interfaz en español. Moneda CLP, fechas dd-mm-yyyy, zona America/Santiago. Usar siempre `lib/format.ts`.
- Estilo: tema oscuro fijo (#000 / #0A0A0A, texto #EDEDED, acento #0070F3), Geist y Geist Mono.
- Lecturas en Server Components; escrituras en Server Actions (`app/**/actions.ts`) validadas con zod.
- Un commit por paso, mensaje claro en español (`feat(area): ...`).
- Lógica de negocio pura (puntuación, mediciones, horas) en `lib/*.ts` con tests en `tests/`.

## Seguridad (requisito de diseño)
- RLS activo en TODAS las tablas. Rol `owner`: acceso total. Rol `viewer`: solo lectura según su fila en `viewers`.
- El viewer NUNCA ve `interview_notes`, `time_log`, `people`, `interviews`, ni documentos confidenciales. Los procesos los lee por la vista `report_processes` (sin `responsable` ni `evidencia`).
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `scripts/` locales. Nunca importarla desde `app/`, `components/` o `lib/`.
- Solo variables `NEXT_PUBLIC_*` llegan al navegador. Secretos en `.env.local` (ignorado por git). Cero datos reales de clientes en el repo.
- Toda migración que toque tablas debe incluir RLS y actualizar `supabase/tests/rls.test.sql`.

## Comandos
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
