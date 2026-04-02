const apiBaseInput = document.getElementById("apiBase");
const taskIdSelect = document.getElementById("taskId");
const operationSelect = document.getElementById("operation");
const paramsArea = document.getElementById("params");
const statusText = document.getElementById("statusText");
const jsonOutput = document.getElementById("jsonOutput");
const segmentsList = document.getElementById("segmentsList");
const summaryMetrics = document.getElementById("summaryMetrics");

document.getElementById("resetBtn").addEventListener("click", resetEpisode);
document.getElementById("stateBtn").addEventListener("click", fetchState);
document.getElementById("stepBtn").addEventListener("click", stepEpisode);

let lastObservation = null;

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function callApi(path, method, body) {
  const base = apiBaseInput.value.trim().replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return data;
}

function setStatus(text) {
  statusText.textContent = text;
}

function renderObservation(obs, context = {}) {
  if (!obs) {
    return;
  }
  lastObservation = obs;
  const m = obs.cognitive_metrics;
  const avgAttention = (m.attention_scores.reduce((a, b) => a + b, 0) / m.attention_scores.length).toFixed(3);
  const avgMemory = (m.memory_retention.reduce((a, b) => a + b, 0) / m.memory_retention.length).toFixed(3);

  const metrics = [
    ["Task", obs.task_id],
    ["Step", `${obs.step}/${obs.max_steps}`],
    ["Engagement", m.engagement_score.toFixed(3)],
    ["Cognitive Load", m.cognitive_load.toFixed(3)],
    ["Emotion", m.emotional_valence.toFixed(3)],
    ["Attention Avg", avgAttention],
    ["Memory Avg", avgMemory],
    ["Flow", m.attention_flow],
    ["Source", m.simulation_source],
  ];
  if (typeof context.reward === "number") {
    metrics.push(["Reward", context.reward.toFixed(4)]);
  }
  if (context.done !== undefined) {
    metrics.push(["Done", String(context.done)]);
  }

  summaryMetrics.innerHTML = metrics
    .map(
      ([name, value]) =>
        `<div class="metric"><div class="name">${name}</div><div class="value">${value}</div></div>`
    )
    .join("");

  segmentsList.innerHTML = obs.segments
    .map(
      (seg, idx) => `
      <div class="segment">
        <strong>#${idx} ${seg.id} (${seg.segment_type})</strong>
        <div class="meta">
          complexity=${seg.complexity_score} | emotion=${seg.emotional_intensity} | emphasis=${seg.emphasis_level} | pacing=${seg.pacing}
        </div>
        <div>${seg.content}</div>
        <div class="meta">
          attention=${m.attention_scores[idx]?.toFixed(3)} | memory=${m.memory_retention[idx]?.toFixed(3)}
        </div>
      </div>
    `
    )
    .join("");
}

async function resetEpisode() {
  try {
    setStatus("Resetting episode...");
    const data = await callApi("/reset", "POST", { task_id: taskIdSelect.value });
    renderObservation(data.observation);
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    setStatus(`Reset complete: ${data.observation.task_id}`);
  } catch (err) {
    setStatus(`Reset failed: ${err.message}`);
  }
}

async function stepEpisode() {
  const parsed = safeJsonParse(paramsArea.value);
  if (!parsed.ok) {
    setStatus(`Invalid params JSON: ${parsed.error}`);
    return;
  }

  try {
    setStatus(`Applying action: ${operationSelect.value}`);
    const payload = {
      operation: operationSelect.value,
      params: parsed.value || {},
    };
    const data = await callApi("/step", "POST", payload);
    renderObservation(data.observation, { reward: data.reward, done: data.done });
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    const grade = data.info && data.info.grade ? ` | grade=${data.info.grade.score}` : "";
    setStatus(`Step complete: reward=${data.reward.toFixed(4)} done=${data.done}${grade}`);
  } catch (err) {
    setStatus(`Step failed: ${err.message}`);
  }
}

async function fetchState() {
  try {
    setStatus("Fetching state...");
    const data = await callApi("/state", "GET");
    const obsLike = {
      task_id: data.state.task_id,
      task_description: "",
      segments: data.state.scenario.segments,
      cognitive_metrics: data.state.cognitive_metrics,
      step: data.state.step,
      max_steps: data.state.max_steps,
      actions_taken: data.state.action_history.map((x) => x.operation),
      constraints: {},
    };
    renderObservation(obsLike);
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    setStatus("State loaded.");
  } catch (err) {
    setStatus(`State failed: ${err.message}`);
  }
}

setStatus("Ready. Start by clicking Reset.");
