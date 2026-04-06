#!/usr/bin/env python3
"""Judge-facing runner for NeuroAd OpenEnv.

Runs the full evaluation loop for each task:
1) /reset
2) multiple /step
3) /grade

Environment variables (required by OpenEnv spec):
  API_BASE_URL  - The API endpoint for the LLM (e.g. https://router.huggingface.co/v1)
  MODEL_NAME    - The model identifier to use for inference
  HF_TOKEN      - Your Hugging Face / API key

Optional:
  NEUROAD_API_URL  - Backend environment URL (default: http://127.0.0.1:7860)
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any
from urllib import error, request

from openai import OpenAI

# -- Environment API (the RL env backend) -----------------------------------
API_BASE = os.environ.get("NEUROAD_API_URL", "http://127.0.0.1:7860").rstrip("/")
API_TIMEOUT_SECONDS = float(os.environ.get("API_TIMEOUT_SECONDS", "20"))
API_RETRIES = int(os.environ.get("API_RETRIES", "3"))

# -- LLM inference credentials (OpenEnv spec required vars) ------------------
API_BASE_URL = os.environ.get("API_BASE_URL", "").rstrip("/")
MODEL_NAME = os.environ.get("MODEL_NAME", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

# Fallback: also accept OPENAI_API_KEY / OPENAI_MODEL for local testing
_LLM_API_KEY = HF_TOKEN or os.environ.get("OPENAI_API_KEY", "")
_LLM_BASE_URL = API_BASE_URL or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
_LLM_MODEL = MODEL_NAME or os.environ.get("OPENAI_MODEL", "Qwen/Qwen2.5-72B-Instruct")

LLM_TIMEOUT_SECONDS = float(os.environ.get("LLM_TIMEOUT_SECONDS", "30"))
LLM_RETRIES = int(os.environ.get("LLM_RETRIES", "2"))

TASK_IDS = ["task_1_easy", "task_2_medium", "task_3_hard"]

ALLOWED_OPS = {
    "reorder",
    "swap",
    "emphasize",
    "de_emphasize",
    "modify_hook",
    "split_segment",
    "merge_segments",
    "set_pacing",
}


def _sleep_backoff(attempt: int) -> None:
    time.sleep(0.35 * (2**attempt))


def _request_json(
    method: str,
    url: str,
    payload: dict[str, Any] | None,
    headers: dict[str, str] | None,
    retries: int,
    timeout_s: float,
) -> dict[str, Any]:
    """Make HTTP requests to the RL environment backend using urllib."""
    final_error: Exception | None = None
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)

    for attempt in range(retries):
        try:
            req = request.Request(url=url, method=method, data=body, headers=req_headers)
            with request.urlopen(req, timeout=timeout_s) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            final_error = exc
            if attempt == retries - 1:
                break
            _sleep_backoff(attempt)

    raise RuntimeError(f"Request failed after {retries} attempts: {url} :: {final_error}")


def api_call(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Call the RL environment REST API."""
    return _request_json(
        method=method,
        url=f"{API_BASE}{path}",
        payload=payload,
        headers=None,
        retries=API_RETRIES,
        timeout_s=API_TIMEOUT_SECONDS,
    )


def _extract_json_object(text: str) -> str | None:
    start = text.find("{")
    while start != -1:
        depth = 0
        for idx in range(start, len(text)):
            ch = text[idx]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start : idx + 1]
        start = text.find("{", start + 1)
    return None


def _safe_parse_action(raw_text: str) -> dict[str, Any] | None:
    candidates: list[str] = [raw_text.strip()]
    embedded = _extract_json_object(raw_text)
    if embedded:
        candidates.append(embedded)

    for candidate in candidates:
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            normalized = re.sub(r"(?<!\\)'", '"', candidate)
            try:
                parsed = json.loads(normalized)
            except json.JSONDecodeError:
                continue

        if not isinstance(parsed, dict):
            continue
        op = parsed.get("operation")
        params = parsed.get("params", {})
        if op in ALLOWED_OPS and isinstance(params, dict):
            return {"operation": op, "params": params}

    return None


class LLMActionPlanner:
    """Plans actions using the OpenAI Python client (HuggingFace, OpenAI, etc.)."""

    def __init__(self) -> None:
        self.enabled = bool(_LLM_API_KEY) and bool(_LLM_BASE_URL)
        self.client: OpenAI | None = None

        if self.enabled:
            # Initialise the OpenAI client. Works with OpenAI-compatible endpoints.
            self.client = OpenAI(
                api_key=_LLM_API_KEY,
                base_url=_LLM_BASE_URL,
                timeout=LLM_TIMEOUT_SECONDS,
            )
            print(f"[LLM] Using model={_LLM_MODEL} at base_url={_LLM_BASE_URL}")
        else:
            print("[LLM] No API key/base URL configured - using heuristic planner only.")

    def _call_llm(self, prompt: str) -> str:
        """Call the LLM using the OpenAI Python client."""
        if self.client is None:
            raise RuntimeError("OpenAI client is not initialised.")

        response = self.client.chat.completions.create(
            model=_LLM_MODEL,
            temperature=0,
            max_tokens=256,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an RL ad-optimization action planner. "
                        "Your job is to choose the best action to improve "
                        "cognitive engagement metrics for an advertisement. "
                        "Return ONLY compact JSON with keys 'operation' and 'params'. "
                        "No markdown, no explanation, no code blocks."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        content = response.choices[0].message.content
        if content is None:
            raise RuntimeError("LLM returned empty content.")
        return content

    def plan(self, observation: dict[str, Any], task_id: str) -> dict[str, Any] | None:
        if not self.enabled or self.client is None:
            return None

        # Summarise observation to keep prompt short (fits small context windows)
        metrics = observation.get("cognitive_metrics", {})
        segments_summary = [
            {
                "id": s.get("id"),
                "type": s.get("segment_type"),
                "pos": s.get("position"),
                "complexity": round(s.get("complexity_score", 0.5), 2),
            }
            for s in observation.get("segments", [])
        ]
        prompt = (
            f"Task: {task_id}\n"
            f"Step: {observation.get('step', 0)}/{observation.get('max_steps', 10)}\n"
            f"Engagement: {metrics.get('engagement_score', 0):.3f}\n"
            f"Attention flow: {metrics.get('attention_flow', 'flat')}\n"
            f"Cognitive load: {metrics.get('cognitive_load', 0.5):.3f}\n"
            f"Segments: {json.dumps(segments_summary, separators=(',', ':'))}\n"
            f"Constraints: {json.dumps(observation.get('constraints', {}), separators=(',', ':'))}\n"
            "\nChoose the single best next action. "
            "Valid operations: reorder, swap, emphasize, de_emphasize, modify_hook, "
            "split_segment, merge_segments, set_pacing.\n"
            "Return ONLY JSON: {\"operation\": \"...\", \"params\": {...}}"
        )

        for attempt in range(LLM_RETRIES):
            try:
                text = self._call_llm(prompt)
                action = _safe_parse_action(text)
                if action:
                    return action
            except Exception as exc:
                print(f"[LLM] attempt {attempt + 1} failed: {exc}")
                if attempt == LLM_RETRIES - 1:
                    break
                _sleep_backoff(attempt)

        return None


def _find_index_by_id(segments: list[dict[str, Any]], seg_id: str) -> int | None:
    for i, seg in enumerate(segments):
        if seg.get("id") == seg_id:
            return i
    return None


def _heuristic_action(observation: dict[str, Any]) -> dict[str, Any]:
    """Rule-based fallback planner - no LLM required."""
    segments: list[dict[str, Any]] = observation.get("segments", [])
    metrics: dict[str, Any] = observation.get("cognitive_metrics", {})
    constraints: dict[str, Any] = observation.get("constraints", {})

    attention: list[float] = metrics.get("attention_scores", [])
    cognitive_load = float(metrics.get("cognitive_load", 0.5))
    step = int(observation.get("step", 0))

    if not segments:
        return {"operation": "swap", "params": {"pos_a": 0, "pos_b": 0}}

    hook_idx = next((i for i, s in enumerate(segments) if s.get("segment_type") == "hook"), None)
    cta_idx = next((i for i, s in enumerate(segments) if s.get("segment_type") == "cta"), None)

    # Priority 1: Shape narrative - hook first, CTA last
    desired_order = list(range(len(segments)))
    changed = False
    if hook_idx is not None and hook_idx != 0:
        desired_order.remove(hook_idx)
        desired_order.insert(0, hook_idx)
        changed = True
    if cta_idx is not None:
        cta_cur = desired_order.index(cta_idx)
        if cta_cur != len(desired_order) - 1:
            desired_order.pop(cta_cur)
            desired_order.append(cta_idx)
            changed = True
    if changed and step < 2:
        return {"operation": "reorder", "params": {"new_order": desired_order}}

    # Priority 2: Reduce load if too high
    load_limit = float(constraints.get("max_cognitive_load", 0.72))
    if cognitive_load > load_limit and segments:
        target = max(segments, key=lambda s: float(s.get("complexity_score", 0.0)))
        return {
            "operation": "set_pacing",
            "params": {"segment_id": target.get("id"), "pacing": "slow"},
        }

    # Priority 3: Emphasize the weakest attention segment
    if attention and len(attention) == len(segments):
        low_idx = min(range(len(attention)), key=lambda i: attention[i])
        return {
            "operation": "emphasize",
            "params": {"segment_id": segments[low_idx].get("id")},
        }

    # Priority 4: Try modifying the hook for variety
    if hook_idx is not None and step % 3 == 2:
        return {
            "operation": "modify_hook",
            "params": {"strategy": "question"},
        }

    # Fallback: swap first two positions
    if len(segments) > 1:
        return {"operation": "swap", "params": {"pos_a": 0, "pos_b": 1}}
    return {"operation": "emphasize", "params": {"segment_id": segments[0].get("id")}}


def _coerce_action(observation: dict[str, Any], action: dict[str, Any] | None) -> dict[str, Any]:
    """Validate and normalise an action, falling back to heuristic if invalid."""
    if not action:
        return _heuristic_action(observation)

    op = action.get("operation")
    params = action.get("params", {})
    segments: list[dict[str, Any]] = observation.get("segments", [])

    if op not in ALLOWED_OPS or not isinstance(params, dict):
        return _heuristic_action(observation)

    # Normalise reorder: accept list of segment IDs or list of indices
    if op == "reorder" and isinstance(params.get("new_order"), list):
        vals = params["new_order"]
        if vals and isinstance(vals[0], str):
            permutation: list[int] = []
            for seg_id in vals:
                idx = _find_index_by_id(segments, seg_id)
                if idx is None:
                    return _heuristic_action(observation)
                permutation.append(idx)
            return {"operation": "reorder", "params": {"new_order": permutation}}

    # Normalise swap: accept either pos_a/pos_b or segmentA/segmentB
    if op == "swap":
        if "segmentA" in params and "segmentB" in params:
            idx_a = _find_index_by_id(segments, str(params["segmentA"]))
            idx_b = _find_index_by_id(segments, str(params["segmentB"]))
            if idx_a is None or idx_b is None:
                return _heuristic_action(observation)
            return {"operation": "swap", "params": {"pos_a": idx_a, "pos_b": idx_b}}

    # Normalise camelCase -> snake_case for emphasize/de_emphasize
    if op == "de_emphasize" and "segmentId" in params:
        return {"operation": "de_emphasize", "params": {"segment_id": params["segmentId"]}}
    if op == "emphasize" and "segmentId" in params:
        return {"operation": "emphasize", "params": {"segment_id": params["segmentId"]}}

    # Normalise set_pacing with numeric value
    if op == "set_pacing" and "pacingValue" in params and "segmentId" in params:
        pace_num = float(params["pacingValue"])
        pacing = "fast" if pace_num >= 0.67 else "medium" if pace_num >= 0.34 else "slow"
        return {
            "operation": "set_pacing",
            "params": {"segment_id": params["segmentId"], "pacing": pacing},
        }

    # Normalise modify_hook with content string
    if op == "modify_hook" and "hookContent" in params:
        content = str(params["hookContent"]).lower()
        if "?" in content:
            strategy = "question"
        elif any(ch.isdigit() for ch in content):
            strategy = "statistic"
        elif any(k in content for k in ("story", "journey", "last year", "once")):
            strategy = "story"
        else:
            strategy = "bold_claim"
        return {"operation": "modify_hook", "params": {"strategy": strategy}}

    if op == "split_segment" and "segmentId" in params:
        return {"operation": "split_segment", "params": {"segment_id": params["segmentId"]}}

    if op == "merge_segments" and "segmentA" in params and "segmentB" in params:
        return {
            "operation": "merge_segments",
            "params": {"segment_ids": [params["segmentA"], params["segmentB"]]},
        }

    return {"operation": op, "params": params}


def run_task(task_id: str, planner: LLMActionPlanner) -> dict[str, Any]:
    """Run one complete episode for a task and return results."""
    print(f"\n[TASK] Starting {task_id} ...")

    reset_result = api_call("POST", "/reset", {"task_id": task_id})
    observation = reset_result.get("observation")
    if not isinstance(observation, dict):
        raise RuntimeError(f"/reset returned unexpected payload for task {task_id}")

    max_steps = int(observation.get("max_steps", 8))
    history: list[dict[str, Any]] = []
    last_info: dict[str, Any] = {}

    for step_num in range(max_steps):
        llm_action = planner.plan(observation, task_id)
        action = _coerce_action(observation, llm_action)

        print(f"  Step {step_num + 1}/{max_steps}: {action['operation']} {action.get('params', {})}")

        step_result = api_call("POST", "/step", action)
        observation = step_result.get("observation")
        reward = float(step_result.get("reward", 0.0))
        done = bool(step_result.get("done", False))
        info = step_result.get("info", {}) if isinstance(step_result.get("info"), dict) else {}
        last_info = info

        history.append({"action": action, "reward": reward})
        print(f"  -> reward={reward:.4f}, done={done}")

        if not isinstance(observation, dict):
            raise RuntimeError(f"/step returned invalid observation for task {task_id}")

        if done:
            break

    # Grade the episode
    grade: dict[str, Any] | None = None
    try:
        grade_result = api_call("POST", "/grade", None)
        if isinstance(grade_result.get("grade"), dict):
            grade = grade_result["grade"]
        elif isinstance(grade_result, dict) and "score" in grade_result:
            grade = grade_result
    except Exception as exc:
        print(f"  [WARN] /grade call failed: {exc}")
        if isinstance(last_info.get("grade"), dict):
            grade = last_info["grade"]

    score = grade.get("score", 0.0) if grade else 0.0
    print(f"  [RESULT] task={task_id} steps={len(history)} score={score:.4f}")

    return {
        "task_id": task_id,
        "steps_executed": len(history),
        "final_reward": history[-1]["reward"] if history else 0.0,
        "grade": grade,
        "history": history,
    }


def main() -> None:
    print("=" * 60)
    print("NeuroAd OpenEnv - Inference Runner")
    print(f"  env_url   : {API_BASE}")
    print(f"  llm_url   : {_LLM_BASE_URL}")
    print(f"  model     : {_LLM_MODEL}")
    print(f"  llm_active: {bool(_LLM_API_KEY)}")
    print("=" * 60)

    # Health check
    try:
        health = api_call("GET", "/health", None)
        print(f"[HEALTH] {health}")
    except RuntimeError as exc:
        raise SystemExit(f"Environment unreachable: {exc}") from exc

    planner = LLMActionPlanner()
    results: list[dict[str, Any]] = []

    for task_id in TASK_IDS:
        try:
            result = run_task(task_id, planner)
            results.append(result)
        except Exception as exc:
            print(f"[ERROR] Task {task_id} failed: {exc}")
            results.append({"task_id": task_id, "error": str(exc), "grade": None})

    # Compute summary
    total = len(results)
    graded = [r for r in results if isinstance(r.get("grade"), dict)]
    avg_score = 0.0
    if graded:
        avg_score = sum(float(r["grade"].get("score", 0.0)) for r in graded) / len(graded)

    summary = {
        "api_base": API_BASE,
        "llm_base": _LLM_BASE_URL,
        "model": _LLM_MODEL,
        "tasks_run": total,
        "tasks_graded": len(graded),
        "average_score": round(avg_score, 4),
        "baseline_scores": {
            r["task_id"]: round(r["grade"].get("score", 0.0), 4)
            for r in results
            if isinstance(r.get("grade"), dict)
        },
        "results": results,
    }

    print("\n" + "=" * 60)
    print("BASELINE SCORES:")
    for task_id, score in summary["baseline_scores"].items():
        print(f"  {task_id}: {score:.4f}")
    print(f"  AVERAGE : {avg_score:.4f}")
    print("=" * 60)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
