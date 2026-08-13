import type { WorkflowSnapshot } from "./workflow.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function label(value: string | null): string {
  return value === null ? "Unavailable" : value.replaceAll("_", " ");
}

export function renderWorkflowObserver(snapshot: WorkflowSnapshot, capability: string): string {
  const steps = snapshot.steps
    .map(
      (step) =>
        `<li><strong>${escapeHtml(step.label)}</strong><span>${escapeHtml(label(step.state))}</span>${step.waiting_reason === null ? "" : `<small>${escapeHtml(step.waiting_reason)}</small>`}</li>`,
    )
    .join("");
  const artifacts = snapshot.artifacts
    .map(
      (artifact) =>
        `<li><a href="/artifact?cap=${encodeURIComponent(capability)}&path=${encodeURIComponent(artifact.path)}">${escapeHtml(artifact.kind)}</a><small>View only · ${escapeHtml(artifact.path)}</small></li>`,
    )
    .join("");
  const initial = JSON.stringify(snapshot).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SDD workflow observer</title><style>
:root{color-scheme:light dark;font:16px/1.5 system-ui,sans-serif}body{margin:0;background:#0b1020;color:#eef2ff}header,main{max-width:72rem;margin:auto;padding:1.5rem}header{display:flex;justify-content:space-between;gap:1rem;align-items:center}.badge{border:1px solid #64748b;border-radius:999px;padding:.25rem .7rem;text-transform:capitalize}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.8rem}.card{background:#151d33;border:1px solid #334155;border-radius:.8rem;padding:1rem}.card h2{font-size:.8rem;text-transform:uppercase;color:#a5b4fc;margin:0 0 .4rem}.card p{font-size:1.15rem;margin:0;text-transform:capitalize}section{margin-top:1.5rem}ul{padding:0;list-style:none}li{display:grid;gap:.2rem;border-bottom:1px solid #334155;padding:.7rem 0}li span,small{color:#cbd5e1}a{color:#93c5fd}a:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.notice{border-left:4px solid #fbbf24;padding:.7rem 1rem;background:#332b16}
</style></head><body><header><div><small>Project ${escapeHtml(snapshot.project_id)}</small><h1>Workflow ${escapeHtml(snapshot.run_id)}</h1></div><span class="badge" id="execution">${escapeHtml(label(snapshot.execution))}</span></header>
<main><p class="notice" id="connection" role="status" aria-live="polite">Read-only observer · live connection pending</p>
<section class="grid" aria-label="Independent workflow status"><article class="card"><h2>CLI outcome</h2><p>${escapeHtml(label(snapshot.cli_status))}</p></article><article class="card"><h2>Merge readiness</h2><p>${escapeHtml(label(snapshot.merge_readiness))}</p></article><article class="card"><h2>Artifact freshness</h2><p>${escapeHtml(label(snapshot.artifact_freshness))}</p></article><article class="card"><h2>Approval</h2><p>${escapeHtml(label(snapshot.approval_state))}</p></article><article class="card"><h2>Integration</h2><p>${escapeHtml(label(snapshot.integration_state))}</p></article></section>
<section aria-labelledby="steps-title"><h2 id="steps-title">Ordered steps</h2><ul>${steps || "<li>No steps observed</li>"}</ul></section><section aria-labelledby="artifacts-title"><h2 id="artifacts-title">Authoritative artifacts</h2><ul>${artifacts || "<li>No retained artifacts referenced</li>"}</ul></section></main>
<script>const initial=${initial};const status=document.getElementById("connection");const stream=new EventSource("/events?cap=${encodeURIComponent(capability)}&after="+initial.last_sequence);stream.onopen=()=>status.textContent="Read-only observer · connected";stream.addEventListener("snapshot",()=>location.reload());stream.onerror=()=>status.textContent="Observer disconnected · workflow and SDD status unchanged";</script></body></html>`;
}
