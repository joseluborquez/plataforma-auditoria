# Panel de auditorías · JLB Systems

Herramienta interna para ordenar cada auditoría de procesos: clientes, áreas, entrevistas, procesos (SIPOC), mediciones de tiempo, priorización, hoja de ruta, documentos y registro de horas. Incluye un reporte de solo lectura imprimible a PDF para la gerencia del cliente.

## Manual de uso
`docs/manual-de-uso.pdf` es la guía paso a paso para empezar desde cero. Se regenera con `docs/generar-manual.py` (requiere `pip install reportlab`).

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
`USER_PASSWORD=... npx tsx --env-file=.env.local scripts/create-user.mts <email> <owner|viewer> [clientId] [areaId]` (requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`).

### Despliegue (Vercel)
Importa el repo de GitHub, define las dos variables `NEXT_PUBLIC_*` y despliega. En Supabase → Auth → URL Configuration agrega la URL de Vercel.

## Flujo de captura de información
1. **Guion** (pestaña del cliente): preguntas por tipo de entrevista, cada una ligada al campo de la ficha que alimenta. Texto editable en `lib/guide.ts`.
2. **Inventario rápido** (pestaña Procesos): una tarea por línea, quedan como «Identificado». Luego se detallan 2 o 3 por área.
3. **Etapas del proceso:** Identificado → Documentado → Medido → Puntuado → Validado. Avanzan solas al medir y al puntuar; «Validado» lo marcas tú tras confirmar con el encargado.
4. **Vínculo entrevista ↔ proceso:** solo el dueño lo ve; el viewer nunca sabe qué entrevista originó cada proceso.
5. **Mediciones:** se registran como declaradas, cronometradas o de registro del sistema, con rango mínimo-máximo. El reporte avisa cuando una comparación se basa en tiempos declarados.
6. **Rúbrica de puntuación** (`lib/rubric.ts`): 1, 3 y 5 definidos para cada criterio; visible en la ficha y en el Guion.

## Revisión de riesgo, controles y alcance
- **Pestaña Riesgos:** tamizaje por ítem de la hoja de ruta (datos personales, decisiones sobre personas, supervisión humana, trazabilidad, transferencia de datos, plan de reversa, responsable) y ficha de 6 controles de la automatización. Calcula un nivel bajo/medio/alto y sugiere acciones. Reglas en `lib/risk.ts`.
- Alineada con NIST AI RMF 1.0 e ISO/IEC 23894 como **referencia**. Es apoyo a la decisión, no certificación ni evaluación legal.
- El cliente ve solo el **nivel** de riesgo en el reporte; las respuestas, el responsable y las notas son privados.
- El reporte incluye la sección **Alcance, método y limitaciones** con declaración de independencia (audita e implementa). Texto en `lib/methodology.ts`: **hazlo revisar por un abogado o especialista en auditoría antes de usarlo con el cliente.**
- Pendiente de validar con asesoría legal: Ley 21.719 de datos personales (vigencia fijada para el 1-dic-2026, con un proyecto que la posterga) y el proyecto de ley de IA en el Senado.

## Para después (no está en el MVP)
Costo por hora por cargo y ahorro en CLP · Costo de implementación y recuperación por ítem de la hoja de ruta · Hallazgos estructurados · Mostrar solo procesos validados en el reporte · Varios encargados por área · historial de puntuaciones · PDF nativo · notificaciones · carga masiva · gráficos avanzados · cobros/planes/chat/IA (fuera de alcance).

## Notas de seguridad y operación
- El viewer **no** ve: notas de entrevistas, horas, personas, entrevistas, `responsable`/`evidencia` de procesos, `fuente` de mediciones, `notas` de la hoja de ruta, RUT/notas del cliente ni documentos confidenciales. Aun así, **no escribas nombres de personas** en campos que sí ve (problemas, pasos, títulos de la hoja de ruta, nombre de documentos).
- Subida de documentos: máx. 4 MB (límite del cuerpo en Vercel).
- Datos de ejemplo: `supabase/seed.sql` crea el cliente ficticio «Ejemplo». Elimínalo con `delete from clients where nombre = 'Ejemplo';` antes de usar datos reales.
- Las migraciones se aplicaron con `apply_migration`/SQL editor; el historial remoto puede tener otros timestamps que los archivos locales. Los archivos de `supabase/migrations/` son la fuente de verdad.
