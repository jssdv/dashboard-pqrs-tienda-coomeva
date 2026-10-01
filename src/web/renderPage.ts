import type { CountBucket, DashboardSummary } from "../domain/summary.js";

const DONUT_COLORS = ["#1E40AF", "#3B82F6", "#D97706", "#1E3A8A", "#64748B"];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function promedioText(value: number | null): string {
  if (value === null) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function horizontalBars(chart: string, buckets: CountBucket[]): string {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const items = buckets
    .map((bucket) => {
      const width = Math.round((bucket.count / max) * 100);
      return `<li><span class="bar-key">${escapeHtml(bucket.key)}</span><span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span><span class="bar-count">${bucket.count}</span></li>`;
    })
    .join("");
  return `<ul class="bars" data-chart="${chart}">${items}</ul>`;
}

function monthChart(buckets: CountBucket[]): string {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const items = buckets
    .map((bucket) => {
      const height = Math.round((bucket.count / max) * 100);
      return `<div class="month" data-month="${escapeHtml(bucket.key)}"><span class="month-count">${bucket.count}</span><span class="month-track"><span class="month-fill" style="height:${height}%"></span></span><span class="month-key">${escapeHtml(bucket.key)}</span></div>`;
    })
    .join("");
  return `<div class="months" data-chart="mes">${items}</div>`;
}

function tipoChart(buckets: CountBucket[]): string {
  const table = `<table><caption>Casos por tipo</caption><thead><tr><th>Tipo</th><th>Casos</th></tr></thead><tbody>${buckets
    .map(
      (bucket) =>
        `<tr><td>${escapeHtml(bucket.key)}</td><td>${bucket.count}</td></tr>`,
    )
    .join("")}</tbody></table>`;
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (buckets.length === 0 || buckets.length > 5 || total === 0) {
    return `<div class="tipo">${horizontalBars("tipo", buckets)}${table}</div>`;
  }
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = buckets
    .map((bucket, index) => {
      const length = (bucket.count / total) * circumference;
      const circle = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${DONUT_COLORS[index]}" stroke-width="12" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"><title>${escapeHtml(bucket.key)}: ${bucket.count}</title></circle>`;
      offset += length;
      return circle;
    })
    .join("");
  const svg = `<svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Casos por tipo">${slices}</svg>`;
  return `<div class="tipo">${svg}${table}</div>`;
}

function section(title: string, body: string): string {
  return `<section class="card"><h2>${title}</h2>${body}</section>`;
}

export function renderPage(summary: DashboardSummary): string {
  const charts =
    summary.total === 0
      ? `<p class="empty">Todavía no hay casos importados. Ejecuta <code>npm run import</code>.</p>`
      : `<div class="grid-charts">${section("Meses", monthChart(summary.porMes))}${section("Tipo", tipoChart(summary.porTipo))}</div><div class="grid-lists">${section("Área", horizontalBars("area", summary.porArea))}${section("Fuente", horizontalBars("fuente", summary.porFuente))}${section("Tema", horizontalBars("tema", summary.porTema))}${section("Año", horizontalBars("anio", summary.porAnio))}</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PQRS Tienda Coomeva</title>
<link rel="stylesheet" href="/dashboard.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600&family=Fira+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<div class="app">
<aside class="side">
<p class="brand">PQRS</p>
<p class="brand-sub">Tienda Coomeva</p>
<nav aria-label="Principal">
<a href="/" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>Resumen</a>
</nav>
</aside>
<main id="contenido">
<header class="page-head">
<h1>Resumen</h1>
<p>Casos importados en la base local</p>
</header>
<section class="kpis" aria-label="Indicadores">
<article class="kpi"><h2>Total</h2><p class="kpi-value" data-kpi="total">${summary.total}</p></article>
<article class="kpi"><h2>Abiertos</h2><p class="kpi-value" data-kpi="abiertos">${summary.abiertos}</p></article>
<article class="kpi"><h2>Cerrados</h2><p class="kpi-value" data-kpi="cerrados">${summary.cerrados}</p></article>
<article class="kpi"><h2>Días promedio</h2><p class="kpi-value" data-kpi="promedio">${promedioText(summary.dias.promedio)}</p></article>
</section>
<p class="invalid">Fechas inválidas: ${summary.fechasInvalidas}</p>
${charts}
</main>
</div>
</body>
</html>`;
}
