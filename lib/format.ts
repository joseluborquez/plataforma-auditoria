const TZ = "America/Santiago";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(value: number): string {
  return clp.format(value);
}

function parts(date: Date, opts: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** dd-mm-yyyy en zona America/Santiago. Acepta Date o ISO string. */
export function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const p = parts(d, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${p.day}-${p.month}-${p.year}`;
}

/** dd-mm-yyyy HH:mm en zona America/Santiago. */
export function formatDateTime(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const p = parts(d, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}`;
}

/** Fecha 'yyyy-mm-dd' (columna date) a dd-mm-yyyy sin conversión de zona. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

/** Minutos a "2 h 30 min". */
export function formatMinutes(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatHours(min: number): string {
  return `${(min / 60).toLocaleString("es-CL", { maximumFractionDigits: 1 })} h`;
}

/** Valor de <input type="datetime-local"> (hora de Santiago) a ISO UTC. */
export function santiagoLocalToISO(local: string): string {
  // Calcula el offset de Santiago para esa fecha y lo aplica.
  const asUTC = new Date(local + "Z");
  const p = parts(asUTC, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  const offset = shown - asUTC.getTime();
  return new Date(asUTC.getTime() - offset).toISOString();
}

/** ISO UTC a valor para <input type="datetime-local"> en hora de Santiago. */
export function isoToSantiagoLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = parts(new Date(iso), {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
}

export function todayISO(): string {
  const p = parts(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Reloj de cronómetro: m:ss, o h:mm:ss desde la primera hora. */
export function formatClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
