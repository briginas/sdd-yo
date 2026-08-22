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
  const stages = snapshot.stages
    .map(
      (stage) =>
        `<li><strong>${escapeHtml(stage.label)}</strong><span>${escapeHtml(label(stage.state))}</span>${stage.reason === null ? "" : `<small>${escapeHtml(stage.reason)}</small>`}</li>`,
    )
    .join("");
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
  const currentStage = snapshot.stages.find(({ stage_id }) => stage_id === snapshot.current_stage_id)?.label ?? null;
  const specContextHidden = snapshot.mode === "spec" ? "" : " hidden";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SDD workflow observer</title><style>
:root{color-scheme:light dark;font:16px/1.5 system-ui,sans-serif}body{margin:0;background:#0b1020;color:#eef2ff}header,main{max-width:72rem;margin:auto;padding:1.5rem}header{display:flex;justify-content:space-between;gap:1rem;align-items:center}.badge{border:1px solid #64748b;border-radius:999px;padding:.25rem .7rem;text-transform:capitalize}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.8rem}.card{background:#151d33;border:1px solid #334155;border-radius:.8rem;padding:1rem}.card h2{font-size:.8rem;text-transform:uppercase;color:#a5b4fc;margin:0 0 .4rem}.card p{font-size:1.15rem;margin:0;text-transform:capitalize}section{margin-top:1.5rem}.context-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:.8rem}.context-grid p{white-space:pre-wrap}ul{padding:0;list-style:none}li{display:grid;gap:.2rem;border-bottom:1px solid #334155;padding:.7rem 0}li span,small{color:#cbd5e1}a{color:#93c5fd}a:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.notice{border-left:4px solid #fbbf24;padding:.7rem 1rem;background:#332b16}
</style></head><body><header><div><small>Project ${escapeHtml(snapshot.project_id)}</small><h1>Workflow ${escapeHtml(snapshot.run_id)}</h1></div><span class="badge" id="execution">${escapeHtml(label(snapshot.execution))}</span></header>
<main><p class="notice" id="connection">Read-only observer · live connection pending</p><p id="update-announcement" role="status" aria-live="polite"></p>
<section class="grid" aria-label="Independent workflow status"><article class="card"><h2>Current stage</h2><p id="current-stage">${escapeHtml(label(currentStage))}</p></article><article class="card"><h2>Observation start</h2><p id="observation-start">${escapeHtml(label(snapshot.observation_start))}</p></article><article class="card"><h2>Implementation</h2><p id="implementation-state">${escapeHtml(label(snapshot.implementation_state))}</p></article><article class="card"><h2>CLI outcome</h2><p id="cli-status">${escapeHtml(label(snapshot.cli_status))}</p></article><article class="card"><h2>Merge readiness</h2><p id="merge-readiness">${escapeHtml(label(snapshot.merge_readiness))}</p></article><article class="card"><h2>Artifact freshness</h2><p id="artifact-freshness">${escapeHtml(label(snapshot.artifact_freshness))}</p></article><article class="card"><h2>Approval</h2><p id="approval-state">${escapeHtml(label(snapshot.approval_state))}</p></article><article class="card"><h2>Integration</h2><p id="integration-state">${escapeHtml(label(snapshot.integration_state))}</p></article></section>
<section id="spec-context" aria-labelledby="spec-context-title"${specContextHidden}><h2 id="spec-context-title">Accepted behavior specification context</h2><p class="notice">Descriptive context only · not approval, QA evidence, test execution evidence, or proof of correct implementation</p><div class="context-grid"><article class="card"><h2>Accepted existing behavior</h2><p id="accepted-behavior">${escapeHtml(label(snapshot.accepted_behavior))}</p></article><article class="card"><h2>Intended QA plan</h2><p id="intended-qa-plan">${escapeHtml(label(snapshot.intended_qa_plan))}</p></article></div></section>
<section aria-labelledby="stages-title"><h2 id="stages-title">Ordered workflow stages</h2><ul id="stages-list">${stages || "<li>No stage model available</li>"}</ul></section><section aria-labelledby="steps-title"><h2 id="steps-title">Detailed observed steps</h2><ul id="steps-list">${steps || "<li>No steps observed</li>"}</ul></section><section aria-labelledby="artifacts-title"><h2 id="artifacts-title">Authoritative artifacts</h2><ul id="artifacts-list">${artifacts || "<li>No retained artifacts referenced</li>"}</ul></section></main>
<script>const initial=${initial};const cap=${JSON.stringify(capability)};const connection=document.getElementById("connection");const announcement=document.getElementById("update-announcement");const display=value=>value===null?"Unavailable":value.replaceAll("_"," ");const setText=(id,value)=>document.getElementById(id).textContent=display(value);const emptyItem=text=>{const item=document.createElement("li");item.textContent=text;return item};const progressItem=(entry,reason)=>{const item=document.createElement("li");const strong=document.createElement("strong");strong.textContent=entry.label;const state=document.createElement("span");state.textContent=display(entry.state);item.append(strong,state);if(reason!==null){const detail=document.createElement("small");detail.textContent=reason;item.append(detail)}return item};const render=next=>{document.getElementById("execution").textContent=display(next.execution);const currentStage=next.stages.find(stage=>stage.stage_id===next.current_stage_id);setText("current-stage",currentStage?.label??null);setText("observation-start",next.observation_start);setText("implementation-state",next.implementation_state);const specContext=document.getElementById("spec-context");specContext.hidden=next.mode!=="spec";setText("accepted-behavior",next.accepted_behavior);setText("intended-qa-plan",next.intended_qa_plan);setText("cli-status",next.cli_status);setText("merge-readiness",next.merge_readiness);setText("artifact-freshness",next.artifact_freshness);setText("approval-state",next.approval_state);setText("integration-state",next.integration_state);const stages=document.getElementById("stages-list");stages.replaceChildren(...(next.stages.length?next.stages.map(stage=>progressItem(stage,stage.reason)):[emptyItem("No stage model available")]));const steps=document.getElementById("steps-list");steps.replaceChildren(...(next.steps.length?next.steps.map(step=>progressItem(step,step.waiting_reason)):[emptyItem("No steps observed")]));const artifacts=document.getElementById("artifacts-list");artifacts.replaceChildren(...(next.artifacts.length?next.artifacts.map(artifact=>{const item=document.createElement("li");const link=document.createElement("a");const target=new URL("/artifact",location.origin);target.searchParams.set("cap",cap);target.searchParams.set("path",artifact.path);link.href=target;link.textContent=artifact.kind;const detail=document.createElement("small");detail.textContent="View only · "+artifact.path;item.append(link,detail);return item}):[emptyItem("No retained artifacts referenced")]));announcement.textContent="Workflow progress updated through sequence "+next.last_sequence};const stream=new EventSource("/events?cap="+encodeURIComponent(cap)+"&after="+initial.last_sequence);stream.onopen=()=>connection.textContent="Read-only observer · connected";stream.addEventListener("snapshot",event=>{try{render(JSON.parse(event.data))}catch{connection.textContent="Observer update invalid · last valid workflow view preserved"}});stream.addEventListener("observer_condition",event=>{try{const value=JSON.parse(event.data).diagnostic_code;connection.textContent=value===null?"Read-only observer · connected":"Observer update invalid ("+value+") · last valid workflow view preserved"}catch{connection.textContent="Observer update invalid · last valid workflow view preserved"}});stream.onerror=()=>connection.textContent="Observer disconnected · workflow and SDD status unchanged";</script></body></html>`;
}
