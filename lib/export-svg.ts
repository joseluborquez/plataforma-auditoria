// Descarga de un SVG como archivo o imagen PNG. Solo se usa en el navegador.

function fileName(name: string, ext: string) {
  const base = name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "diagrama";
  return `${base}.${ext}`;
}

/** Serializa el SVG resolviendo las variables de color del tema (un archivo suelto no las conoce). */
function toMarkup(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("font-family", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");
  const cs = getComputedStyle(document.documentElement);
  return new XMLSerializer().serializeToString(clone).replace(/var\((--[a-z0-9-]+)\)/gi, (_, n: string) => cs.getPropertyValue(n).trim() || "#888888");
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(svg: SVGSVGElement, name: string) {
  save(new Blob([toMarkup(svg)], { type: "image/svg+xml;charset=utf-8" }), fileName(name, "svg"));
}

export async function downloadPng(svg: SVGSVGElement, name: string, scale = 2) {
  const w = svg.viewBox.baseVal.width, h = svg.viewBox.baseVal.height;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(toMarkup(svg));
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite exportar la imagen.");
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  save(blob, fileName(name, "png"));
}
