"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { check, one } from "@/lib/db";
import { assessRisk, CONTROLS, RISK_QUESTIONS, type RiskAnswers } from "@/lib/risk";

export async function saveRiskAction(clientId: string, itemId: string, fd: FormData) {
  const { supabase } = await requireOwner();
  z.string().uuid().parse(itemId);

  const answers = Object.fromEntries(RISK_QUESTIONS.map((q) => [q.key, fd.get(q.key) === "on"])) as RiskAnswers;
  const controles = Object.fromEntries(CONTROLS.map((c) => [c.key, fd.get(`ctl_${c.key}`) === "on"]));
  const responsable = typeof fd.get("responsable_cliente") === "string" ? (fd.get("responsable_cliente") as string).trim() : "";
  const notas = typeof fd.get("notas") === "string" ? (fd.get("notas") as string).trim() : "";

  // ¿El proceso del ítem se decidió como «integrar IA»? Suma puntaje de riesgo.
  const item = one<{ process_id: string | null }>(
    await supabase.from("roadmap_items").select("process_id").eq("id", itemId).eq("client_id", clientId).maybeSingle(),
  );
  if (!item) throw new Error("Ítem no encontrado");
  let usaIA = false;
  if (item.process_id) {
    const sc = one<{ decision: string | null }>(await supabase.from("scores").select("decision").eq("process_id", item.process_id).maybeSingle());
    usaIA = sc?.decision === "integrar_ia";
  }

  const { nivel } = assessRisk(answers, usaIA);
  check(await supabase.from("risk_reviews").upsert({
    roadmap_item_id: itemId, ...answers, responsable_cliente: responsable || null,
    controles, nivel, notas: notas || null, revisado_en: new Date().toISOString(),
  }));
  revalidatePath(`/clientes/${clientId}`, "layout");
}
