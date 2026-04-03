#!/usr/bin/env python3
"""Judge-facing runner for NeuroAd.

Runs the full evaluation loop for each task:
1) /reset
2) multiple /step
3) /grade

Features:
- temperature=0 LLM calls (optional)
- robust JSON extraction/parsing for LLM outputs
- retry logic for API and LLM calls
- heuristic fallback actions when LLM output is invalid
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any
from urllib import error, request

API_BASE = os.environ.get("NEUROAD_API_URL", "http://127.0.0.1:7860").rstrip("/")
API_TIMEOUT_SECONDS = float(os.environ.get("API_TIMEOUT_SECONDS", "20"))
API_RETRIES = int(os.environ.get("API_RETRIES", "3"))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
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
    def __init__(self) -> None:
        self.enabled = bool(OPENAI_API_KEY)

    def _call_openai(self, prompt: str) -> str:
        payload = {
            "model": OPENAI_MODEL,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an RL ad-optimization action planner. "
                        "Return only compact JSON with keys operation and params."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        response = _request_json(
            method="POST",
            url="https://api.openai.com/v1/chat/completions",
            payload=payload,
            headers=headers,
            retries=LLM_RETRIES,
            timeout_s=LLM_TIMEOUT_SECONDS,
        )
        try:
            return response["choices"][0]["message"]["content"]
        except Exception as exc:
            raise RuntimeError(f"Unexpected LLM response format: {exc}") from exc

    def plan(self, observation: dict[str, Any], task_id: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None

        prompt = (
            "Choose the best next action for this task. "
            "Output JSON only: {\"operation\": ..., \"params\": {...}}. "
            "Valid operations: reorder, swap, emphasize, de_emphasize, modify_hook, "
            "split_segment, merge_segments, set_pacing. "
            f"Task: {task_id}\n"
            f"Observation: {json.dumps(observation, separators=(',', ':'))}"
        )

        for attempt in range(LLM_RETRIES):
            try:
                text = self._call_openai(prompt)
                action = _safe_parse_action(text)
                if action:
                    return action
            except Exception:
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
    segments: list[dict[str, Any]] = observation.get("segments", [])
    metrics: dict[str, Any] = observation.get("cognitive_metrics", {})
    constraints: dict[str, Any] = observation.get("constraints", {})

    attention: list[float] = metrics.get("attention_scores", [])
    cognitive_load = float(metrics.get("cognitive_load", 0.5))

    if not segments:
        return {"operation": "swap", "params": {"pos_a": 0, "pos_b": 0}}

    hook_idx = next((i for i, s in enumerate(segments) if s.get("segment_type") == "hook"), None)
    cta_idx = next((i for i, s in enumerate(segments) if s.get("segment_type") == "cta"), None)

    # First preference: shape narrative with hook first and CTA last.
    desired_order = list(range(len(segments)))
    changed = False
    if hook_idx is not None and hook_idx != 0:
        desired_order.remove(hook_idx)
        desired_order.insert(0, hook_idx)
        changed = True
    if cta_idx is not None:
        # Recompute index position within desired_order after potential hook move.
        cta_cur = desired_order.index(cta_idx)
        if cta_cur != len(desired_order) - 1:
            desired_order.pop(cta_cur)
            desired_order.append(cta_idx)
            changed = True
    if changed:
        return {"operation": "reorder", "params": {"new_order": desired_order}}

    # If load is too high, slow down the most complex segment.
    load_limit = float(constraints.get("max_cognitive_load", 0.72))
    if cognitive_load > load_limit:
        target = max(segments, key=lambda s: float(s.get("complexity_score", 0.0)))
        return {"operation": "set_pacing", "params": {"segment_id": target.get("id"), "pacing": "slow"}}

    # Emphasize lowest-attention segment to improve weak spots.
    if attention and len(attention) == len(segments):
        low_idx = min(range(len(attention)), key=lambda i: attention[i])
        return {"operation": "emphasize", "params": {"segment_id": segments[low_idx].get("id")}}

    # Fallback safe no-op-like swap between first two positions if available.
    if len(segments) > 1:
        return {"operation": "swap", "params": {"pos_a": 0, "pos_b": 1}}
    return {"operation": "emphasize", "params": {"segment_id": segments[0].get("id")}}


def _coerce_action(observation: dict[str, Any], action: dict[str, Any] | None) -> dict[str, Any]:
    if not action:
        return _heuristic_action(observation)

    op = action.get("operation")
    params = action.get("params", {})
    segments: list[dict[str, Any]] = observation.get("segments", [])

    if op not in ALLOWED_OPS or not isinstance(params, dict):
        return _heuristic_action(observation)

    # Normalize some common malformed payloads from LLM output.
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

    if op == "swap":
        if "segmentA" in params and "segmentB" in params:
            idx_a = _find_index_by_id(segments, str(params["segmentA"]))
            idx_b = _find_index_by_id(segments, str(params["segmentB"]))
            if idx_a is None or idx_b is None:
                return _heuristic_action(observation)
            return {"operation": "swap", "params": {"pos_a": idx_a, "pos_b": idx_b}}

    if op == "de_emphasize" and "segmentId" in params:
        return {"operation": "de_emphasize", "params": {"segment_id": params["segmentId"]}}

    if op == "emphasize" and "segmentId" in params:
        return {"operation": "emphasize", "params": {"segment_id": params["segmentId"]}}

    if op == "set_pacing" and "pacingValue" in params and "segmentId" in params:
        pace_num = float(params["pacingValue"])
        pacing = "fast" if pace_num >= 0.67 else "medium" if pace_num >= 0.34 else "slow"
        return {"operation": "set_pacing", "params": {"segment_id": params["segmentId"], "pacing": pacing}}

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
    reset_payload = {"task_id": task_id}
    reset_result = api_call("POST", "/reset", reset_payload)
    observation = reset_result.get("observation")
    if not isinstance(observation, dict):
        raise RuntimeError(f"/reset returned unexpected payload for task {task_id}")

    max_steps = int(observation.get("max_steps", 8))
    history: list[dict[str, Any]] = []
    last_info: dict[str, Any] = {}

    for _ in range(max_steps):
        llm_action = planner.plan(observation, task_id)
        action = _coerce_action(observation, llm_action)

        step_result = api_call("POST", "/step", action)
        observation = step_result.get("observation")
        reward = float(step_result.get("reward", 0.0))
        done = bool(step_result.get("done", False))
        info = step_result.get("info", {}) if isinstance(step_result.get("info"), dict) else {}
        last_info = info

        history.append({"action": action, "reward": reward})

        if not isinstance(observation, dict):
            raise RuntimeError(f"/step returned invalid observation for task {task_id}")

        if done:
            break

    grade: dict[str, Any] | None = None
    try:
        grade_result = api_call("POST", "/grade", None)
        if isinstance(grade_result.get("grade"), dict):
            grade = grade_result["grade"]
        elif isinstance(grade_result, dict):
            grade = grade_result
    except Exception:
        # Fallback: grade may already be attached at final step.
        if isinstance(last_info.get("grade"), dict):
            grade = last_info["grade"]

    return {
        "task_id": task_id,
        "steps_executed": len(history),
        "final_reward": history[-1]["reward"] if history else 0.0,
        "grade": grade,
        "history": history,
    }


def main() -> None:
    # Health check up front to fail early if API is unreachable.
    _ = api_call("GET", "/health", None)

    planner = LLMActionPlanner()
    results: list[dict[str, Any]] = []

    for task_id in TASK_IDS:
        results.append(run_task(task_id, planner))

    total = len(results)
    graded = [r for r in results if isinstance(r.get("grade"), dict)]
    avg_score = 0.0
    if graded:
        avg_score = sum(float(r["grade"].get("score", 0.0)) for r in graded) / len(graded)

    summary = {
        "api_base": API_BASE,
        "tasks_run": total,
        "tasks_graded": len(graded),
        "average_score": round(avg_score, 4),
        "results": results,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
