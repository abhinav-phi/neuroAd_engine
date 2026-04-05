---
title: neuroAd_engine
emoji: 🚀
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---


# NeuroAd — Cognitive Ad Testing Environment

> **OpenEnv Hackathon Round 1 Submission**
> An RL training environment for AI agents that optimise advertisement content
> using neuroscience-grounded cognitive simulation.

[![HuggingFace Spaces](https://img.shields.io/badge/🤗%20Spaces-neuroad--openenv-blue)](https://huggingface.co/spaces/your-username/neuroad-openenv)
[![OpenEnv](https://img.shields.io/badge/OpenEnv-1.0.0-green)](https://openenv.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

**NeuroAd** is a real-world RL environment where an AI agent learns to restructure
advertisement copy to maximise predicted cognitive engagement. The environment
simulates how the human brain would respond to different ad presentations using
either Meta's **TRIBE v2** brain encoding model or a calibrated parametric fallback.

### The Core Task

Given an advertisement broken into ordered segments (hook, body, testimonial, CTA),
the agent can reorder, emphasise, split, merge, and modify segments to improve:

- **Attention scores** — how strongly each segment grabs visual focus
- **Memory retention** — how well users will recall the content
- **Cognitive load** — mental effort required (lower is usually better)
- **Emotional valence** — positive vs. negative emotional tone
- **Engagement score** — composite metric combining all of the above

### Why This Matters

Advertising is a $700B+ industry where A/B testing takes weeks and cognitive
research is expensive. A capable RL agent that can cognitively optimise ad copy
in minutes has immediate commercial value.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript)                          │
│  CogniFlow UI — drag/drop editor, live cognitive graphs │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP (REST)
┌───────────────────▼─────────────────────────────────────┐
│  FastAPI Backend (src/app.py)                           │
│  POST /reset  POST /step  POST /grade  GET /state       │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│  RL Environment (src/env.py)                            │
│  Action execution, constraint checking, episode mgmt    │
└──────┬───────────────────────────────┬──────────────────┘
       │                               │
┌──────▼──────┐               ┌────────▼────────────────┐
│ Simulator   │               │  Reward + Grader        │
│ (parametric │               │  (src/reward.py,        │
│  or TRIBE)  │               │   src/grader.py)        │
└─────────────┘               └─────────────────────────┘
```

### Key Files

| File | Role |
|------|------|
| `src/app.py` | FastAPI entrypoint, REST API |
| `src/env.py` | OpenEnv environment lifecycle |
| `src/simulator.py` | Parametric cognitive simulator |
| `src/tribe_bridge.py` | TRIBE v2 adapter + attention flow classifier |
| `src/reward.py` | Dense multi-component reward function |
| `src/grader.py` | Episode scoring with rubric breakdown |
| `src/models.py` | Pydantic typed models (Observation, Action, etc.) |
| `src/tasks.py` | Task configurations for easy/medium/hard |
| `inference.py` | Judge runner — evaluates all 3 tasks |
| `calibration/` | Parametric simulator coefficients |
| `frontend/` | React/Vite CogniFlow UI |

---

## Observation Space

Each call to `/reset` or `/step` returns an `Observation`:

```json
{
  "task_id": "task_1_easy",
  "task_description": "...",
  "segments": [
    {
      "id": "seg_hook_0",
      "content": "Want to finish your workday earlier?",
      "segment_type": "hook",
      "word_count": 7,
      "complexity_score": 0.30,
      "emotional_intensity": 0.45,
      "has_question": true,
      "has_number": false,
      "position": 0,
      "emphasis_level": 0,
      "pacing": "medium"
    }
  ],
  "cognitive_metrics": {
    "attention_scores": [0.72, 0.55, 0.68, 0.51, 0.74],
    "memory_retention": [0.61, 0.48, 0.71, 0.44, 0.65],
    "cognitive_load": 0.52,
    "emotional_valence": 0.22,
    "engagement_score": 0.61,
    "attention_flow": "rising"
  },
  "step": 3,
  "max_steps": 8,
  "constraints": {"max_cognitive_load": 0.75}
}
```

**Per-segment metrics** (`attention_scores[i]`, `memory_retention[i]`) reflect the
specific contribution of each segment at its current position.

---

## Action Space

Eight operations are available. All actions take a structured `params` dict:

| Operation | Required Params | Effect |
|-----------|-----------------|--------|
| `reorder` | `new_order: list[int]` — full permutation | Reorder all segments |
| `swap` | `pos_a: int, pos_b: int` | Swap two segment positions |
| `emphasize` | `segment_id: str` | Increase emphasis level (0→3) |
| `de_emphasize` | `segment_id: str` | Decrease emphasis level |
| `modify_hook` | `strategy: question\|statistic\|story\|bold_claim` | Rewrite the hook segment |
| `split_segment` | `segment_id: str` | Split segment at midpoint |
| `merge_segments` | `segment_ids: [id1, id2]` | Merge two adjacent segments |
| `set_pacing` | `segment_id: str, pacing: fast\|medium\|slow` | Change delivery pacing |

**Example action:**
```json
{"operation": "reorder", "params": {"new_order": [2, 0, 1, 3, 4]}}
```

---

## Reward Function

The reward is **dense** — every step produces a non-zero signal. Total reward is
clamped to `[-1.0, 1.0]`.

| Component | Weight | Description |
|-----------|--------|-------------|
| `attention_delta` | 0.25 | Change in mean attention across segments |
| `memory_delta` | 0.25 | Change in mean memory retention |
| `engagement_delta` | 0.20 | Change in composite engagement score |
| `load_penalty` | 0.15 | Penalty when cognitive load exceeds 0.70 |
| `repetition_penalty` | 0.10 | Penalty for repeating same action back-to-back |
| `novelty_bonus` | 0.05 | Reward for using diverse action types (outcome-gated) |
| `flow_bonus` | 0.10 | Bonus when attention curve matches task target shape |

Invalid actions (bad params, out-of-range indices) return `−0.20`.

---

## Tasks

### Task 1 — Easy (`task_1_easy`)

**Scenario:** Productivity app ad, 5 segments  
**Goal:** Improve attention + engagement while keeping cognitive load < 0.75  
**Max Steps:** 8  
**Desired attention flow:** `rising`  
**Key challenge:** Hook is initially in position 2, not position 0

### Task 2 — Medium (`task_2_medium`)

**Scenario:** Health wearable ad, 6 segments  
**Goal:** Balance memory retention AND emotional valence, load < 0.72  
**Max Steps:** 10  
**Desired attention flow:** `u_shaped` (emotional dip then recovery)  
**Key challenge:** Requires coordinating multiple segment types for the U-shaped arc

### Task 3 — Hard (`task_3_hard`)

**Scenario:** Compliance SaaS regulated ad, 6 segments  
**Goal:** Maximise engagement under strict structural constraints:
- Brand segment must be in top 2 positions
- CTA must be last
- Maximum 2 emphasis actions
- Cognitive load < 0.70  
**Max Steps:** 12  
**Desired attention flow:** `rising`  
**Key challenge:** Simultaneous optimisation + regulatory compliance

---

## Grading Rubric

Each episode is scored 0.0 – 1.0:

| Criterion | Weight | Measurement |
|-----------|--------|-------------|
| Quality score | 55% | How much did cognitive metrics improve vs. baseline? |
| Constraints score | 20% | Were all task constraints satisfied at end? |
| Flow score | 10% | Does final attention curve match task target? |
| Diversity score | 10% | Ratio of unique action types used |
| Efficiency score | 5% | Did the agent use fewer steps than the maximum? |

---

## Baseline Scores

Run `python inference.py` to reproduce these scores.

| Task | Heuristic Score | Notes |
|------|----------------|-------|
| `task_1_easy` | ~0.65 | Good attention improvement, rising flow achieved |
| `task_2_medium` | ~0.58 | Memory improvement with partial u-shaped arc |
| `task_3_hard` | ~0.52 | Constraint-compliant with moderate engagement gain |
| **Average** | **~0.58** | |

*Scores use the heuristic planner (no LLM). With an LLM at `API_BASE_URL`, scores improve.*

---

## Setup & Usage

### Backend Only (API + Parametric Simulator)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Start the API server
uvicorn backend.src.app:app --host 0.0.0.0 --port 7860

# 3. Check health
curl http://localhost:7860/health
```

### Full Stack (Backend + React Frontend)

```bash
# Backend
pip install -r requirements.txt
uvicorn backend.src.app:app --host 0.0.0.0 --port 7860 &

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173` (Vite dev server).

### Docker (Production)

```bash
# Build (includes frontend compilation)
docker build -t neuroad .

# Run
docker run -p 7860:7860 neuroad

# With TRIBE v2 model (GPU recommended)
docker build --build-arg INSTALL_TRIBEV2=true -t neuroad-tribe .
```

### Running the Judge Runner (inference.py)

```bash
# Required environment variables (OpenEnv spec)
export API_BASE_URL="https://router.huggingface.co/v1"
export MODEL_NAME="Qwen/Qwen2.5-72B-Instruct"
export HF_TOKEN="hf_your_token_here"

# Optional: point to your environment
export NEUROAD_API_URL="http://localhost:7860"

# Run evaluation
python inference.py
```

The runner will evaluate all 3 tasks and print a JSON summary with baseline scores.

---

## TRIBE v2 Integration

The environment supports Meta's TRIBE v2 brain encoding model for higher-fidelity
cognitive simulation. When enabled, segment text is passed through TRIBE v2 and
predicted brain region activations (V1, PEF, Hippocampus, Amygdala, IFSa) are
mapped to cognitive metrics.

**To enable TRIBE v2:**
```bash
export USE_TRIBEV2=true
```

Without the model, the environment automatically falls back to the calibrated
parametric simulator. The parametric mode is validated against TRIBE v2 outputs
(see `calibration/` directory) with correlation coefficients of 0.76–0.87.

---

## API Reference

All endpoints return JSON. See `http://localhost:7860/docs` for interactive docs.

### `POST /reset`
```json
// Request
{"task_id": "task_1_easy"}
// Response
{"observation": {...}}
```

### `POST /step`
```json
// Request
{"operation": "reorder", "params": {"new_order": [2, 0, 1, 3, 4]}}
// Response
{"observation": {...}, "reward": 0.042, "done": false, "info": {"reward_info": {...}}}
```

### `POST /grade`
```json
// Response
{"grade": {"score": 0.68, "breakdown": {...}, "feedback": "..."}}
```

### `GET /state`
```json
// Response
{"state": {...}, "observation": {...}}
```

### `GET /health`
```json
{"status": "ok", "service": "neuroad-openenv", "version": "1.0.0"}
```

---

## Team

| Member | Ownership |
|--------|-----------|
| Member A | Environment architecture, API foundation, task definitions |
| Member B | Simulator, reward function, grader, TRIBE v2 bridge |
| Member C | Frontend (CogniFlow UI), deployment, inference runner |

---

## Scientific References

- Murdock, B. B. (1962). The serial position effect of free recall. *Journal of Experimental Psychology*
- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science*
- Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system.
- Damasio, A. R. (1994). Descartes' Error: Emotion, Reason, and the Human Brain.
- Tang, J., et al. (2023). TRIBE: A tri-modal brain encoding model. *Meta AI Research*

---

## License

MIT — see [LICENSE](LICENSE)

