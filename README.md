# Panel de auditorías · JLB Systems

Herramienta interna para ordenar cada auditoría de procesos: clientes, áreas, entrevistas, procesos (SIPOC), mediciones de tiempo, priorización, hoja de ruta, documentos y registro de horas. Incluye un reporte de solo lectura imprimible a PDF para la gerencia del cliente.

## Cómo correrlo
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa los valores (Supabase → Project Settings → API).
3. Aplica las migraciones de `supabase/migrations/` al proyecto (ver «Base de datos»).
4. `npm run dev` y abre http://localhost:3000

### Variables de entorno
| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app + Vercel | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app + Vercel | clave pública (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo scripts locales | **no** subir a Vercel ni usar en la app |

### Base de datos
Las migraciones están en `supabase/migrations/` (fuente de verdad). Con la CLI: `supabase link --project-ref <ref>` y `supabase db push`. Datos de ejemplo ficticios: `supabase/seed.sql` (cliente «Ejemplo»).

### Tests
- `npm test`: unitarios (formato, puntuación, mediciones, horas).
- `supabase/tests/rls.test.sql`: pruebas de políticas RLS. Cada bloque corre en una transacción que termina en `ROLLBACK`; si una aserción falla, lanza error. Se ejecuta con `psql -f` o desde el SQL editor.

### Usuarios
`USER_PASSWORD=... npx tsx --env-file=.env.local scripts/create-user.ts <email> <owner|viewer> [clientId] [areaId]` (requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`).

### Despliegue (Vercel)
Importa el repo de GitHub, define las dos variables `NEXT_PUBLIC_*` y despliega. En Supabase → Auth → URL Configuration agrega la URL de Vercel.

## Para después (no está en el MVP)
Varios encargados por área · historial de puntuaciones · PDF nativo · notificaciones · carga masiva · gráficos avanzados · cobros/planes/chat/IA (fuera de alcance).

## Notas de seguridad y operación
- El viewer **no** ve: notas de entrevistas, horas, personas, entrevistas, `responsable`/`evidencia` de procesos, `fuente` de mediciones, `notas` de la hoja de ruta, RUT/notas del cliente ni documentos confidenciales. Aun así, **no escribas nombres de personas** en campos que sí ve (problemas, pasos, títulos de la hoja de ruta, nombre de documentos).
- Subida de documentos: máx. 4 MB (límite del cuerpo en Vercel).
- Datos de ejemplo: `supabase/seed.sql` crea el cliente ficticio «Ejemplo». Elimínalo con `delete from clients where nombre = 'Ejemplo';` antes de usar datos reales.
- Las migraciones se aplicaron con `apply_migration`/SQL editor; el historial remoto puede tener otros timestamps que los archivos locales. Los archivos de `supabase/migrations/` son la fuente de verdad.
