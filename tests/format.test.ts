import { describe, expect, it } from "vitest";
import {
  formatCLP, formatDate, formatDateOnly, formatDateTime, formatMinutes,
  isoToSantiagoLocal, santiagoLocalToISO,
} from "@/lib/format";

describe("format", () => {
  it("formatea CLP sin decimales", () => {
    expect(formatCLP(1234567).replace(/\s/g, " ")).toContain("1.234.567");
  });
  it("formatea fechas dd-mm-yyyy en Santiago", () => {
    // 01-01-2026 02:00 UTC = 31-12-2025 23:00 en Santiago (UTC-3 en verano)
    expect(formatDate("2026-01-01T02:00:00Z")).toBe("31-12-2025");
    expect(formatDateTime("2026-07-15T15:30:00Z")).toBe("15-07-2026 11:30");
  });
  it("maneja valores vacíos", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateOnly(undefined)).toBe("—");
  });
  it("fecha sin zona", () => {
    expect(formatDateOnly("2026-03-05")).toBe("05-03-2026");
  });
  it("minutos legibles", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(150)).toBe("2 h 30 min");
  });
  it("ida y vuelta datetime-local", () => {
    const iso = santiagoLocalToISO("2026-07-15T11:30");
    expect(isoToSantiagoLocal(iso)).toBe("2026-07-15T11:30");
    const iso2 = santiagoLocalToISO("2026-01-10T09:00");
    expect(isoToSantiagoLocal(iso2)).toBe("2026-01-10T09:00");
  });
});

describe("formatClock", () => {
  it("formatea m:ss y h:mm:ss", async () => {
    const { formatClock } = await import("../lib/format");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(7384)).toBe("2:03:04");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(59.9)).toBe("0:59");
  });
});
