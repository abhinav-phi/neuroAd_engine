"""
PATCH FILE — drop this into backend/src/ alongside simulator.py
Provides an enhanced simulate_with_noise and _build_text_scenario that 
produce genuinely varied output on every call.

Root cause of identical numbers:
1. _build_text_scenario() in app.py always produces nearly identical 
   base complexity/emotion values (0.35, 0.50, 0.25 hardcoded)
2. simulate_with_noise() uses Python's global random state which,
   if not re-seeded, can produce similar sequences
3. The noise_scale (0.08) is too small relative to the base differences

This patch replaces those functions with content-aware, time-seeded versions.
"""

from __future__ import annotations

import hashlib
import random
import re
import time
from typing import Any

from backend.src.models import AdScenario, AdSegment
from backend.src.tribe_bridge import classify_attention_flow


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


# ─────────────────────────────────────────────────────────────────────────────
# Content analysis helpers
# ─────────────────────────────────────────────────────────────────────────────

def _analyze_text_properties(text: str) -> dict:
    """Extract meaningful properties from ad text to vary simulation inputs."""
    words = text.split()
    word_count = len(words)
    
    # Sentence complexity: avg words per sentence
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    avg_sentence_len = word_count / max(1, len(sentences))
    
    # Emotional words (positive + negative)
    positive_words = {
        'free', 'best', 'amazing', 'incredible', 'love', 'perfect', 'easy',
        'simple', 'fast', 'save', 'win', 'success', 'powerful', 'proven',
        'trusted', 'safe', 'guaranteed', 'exclusive', 'premium', 'great',
        'happy', 'joy', 'dream', 'achieve', 'boost', 'improve', 'grow',
        'discover', 'new', 'transform', 'now', 'today', 'instantly', 'results'
    }
    negative_words = {
        'pain', 'struggle', 'fail', 'lose', 'cost', 'risk', 'hard', 'difficult',
        'problem', 'issue', 'worry', 'fear', 'stress', 'bad', 'wrong', 'broken',
        'missing', 'behind', 'stuck', 'frustrat'
    }
    
    text_lower = text.lower()
    words_lower = [w.strip('.,!?;:()[]') for w in words]
    
    pos_count = sum(1 for w in words_lower if w in positive_words)
    neg_count = sum(1 for w in words_lower if w in negative_words)
    
    has_numbers = bool(re.search(r'\d+', text))
    has_question = '?' in text
    has_exclamation = '!' in text
    has_percentage = '%' in text
    has_dollar = '$' in text
    
    # Technical/jargon density
    jargon_words = {
        'synergy', 'leverage', 'optimize', 'scalable', 'ecosystem', 'paradigm',
        'infrastructure', 'blockchain', 'algorithm', 'ai', 'machine learning',
        'neural', 'cognitive', 'analytics', 'platform', 'solution', 'enterprise'
    }
    jargon_count = sum(1 for w in words_lower if w in jargon_words)
    
    # Compute derived metrics
    complexity_base = min(0.9, max(0.1, 
        (avg_sentence_len / 30) * 0.4 +  # longer sentences = more complex
        (jargon_count / max(1, word_count)) * 3.0 * 0.3 +  # jargon
        (word_count / 200) * 0.3  # longer ads = more complex
    ))
    
    # Emotional intensity: positive words drive it up, negatives create tension
    total_emotional = pos_count + neg_count * 0.8
    emotion_base = min(0.9, max(0.1,
        (total_emotional / max(1, word_count)) * 8.0 * 0.5 +
        (0.3 if has_exclamation else 0) +
        (0.2 if has_question else 0)
    ))
    
    return {
        "word_count": word_count,
        "sentence_count": len(sentences),
        "avg_sentence_len": avg_sentence_len,
        "complexity_base": complexity_base,
        "emotion_base": emotion_base,
        "has_numbers": has_numbers,
        "has_question": has_question,
        "has_exclamation": has_exclamation,
        "has_percentage": has_percentage,
        "has_dollar": has_dollar,
        "pos_word_ratio": pos_count / max(1, word_count),
        "neg_word_ratio": neg_count / max(1, word_count),
        "jargon_ratio": jargon_count / max(1, word_count),
        "content_hash": int(hashlib.md5(text.encode()).hexdigest()[:8], 16),
    }


def build_varied_text_scenario(text: str) -> AdScenario:
    """
    Build an AdScenario from text with CONTENT-AWARE, VARIED properties.
    
    Unlike the original _build_text_scenario() which used hardcoded
    complexity values (0.35, 0.50, 0.25), this version:
    1. Analyzes actual text content to derive realistic base values
    2. Applies time-seeded noise so every call differs
    3. Creates more semantically meaningful segments
    """
    props = _analyze_text_properties(text)
    
    # Time-seeded RNG — different result every call even for identical text
    seed = (props["content_hash"] + int(time.time() * 100)) % (2**31)
    rng = random.Random(seed)
    
    tokens = [t for t in text.split() if t.strip()]
    if len(tokens) < 3:
        tokens = (tokens + ["engage", "your", "audience", "now"])[:4]

    n = len(tokens)
    # Split into 3 meaningful chunks based on content length
    split1 = max(1, n // 3)
    split2 = max(split1 + 1, (2 * n) // 3)

    chunks = [
        " ".join(tokens[:split1]),
        " ".join(tokens[split1:split2]) or "Discover what makes this different.",
        " ".join(tokens[split2:]) or "Start now.",
    ]

    # Per-segment complexity variation based on position and content
    def _seg_complexity(chunk: str, base: float) -> float:
        """Complexity varies by chunk content + controlled noise."""
        chunk_props = _analyze_text_properties(chunk)
        local_base = (base * 0.6 + chunk_props["complexity_base"] * 0.4)
        noise = rng.gauss(0, 0.12)  # ±12% noise
        return _clamp(local_base + noise, 0.05, 0.95)

    def _seg_emotion(chunk: str, base: float) -> float:
        """Emotion varies by chunk sentiment + controlled noise."""
        chunk_props = _analyze_text_properties(chunk)
        local_base = (base * 0.6 + chunk_props["emotion_base"] * 0.4)
        noise = rng.gauss(0, 0.15)  # ±15% noise
        return _clamp(local_base + noise, 0.05, 0.95)

    pacing_choices = ["fast", "medium", "slow"]
    pacing_weights = [0.25, 0.50, 0.25]  # medium most common

    def _pick_pacing() -> str:
        return rng.choices(pacing_choices, weights=pacing_weights)[0]

    emphasis_choices = [0, 0, 1, 1, 2]  # weighted toward 0-1

    segments = [
        AdSegment(
            id="seg_hook_0",
            content=chunks[0],
            segment_type="hook",
            word_count=max(1, len(chunks[0].split())),
            complexity_score=_seg_complexity(chunks[0], props["complexity_base"] * 0.8),  # hooks simpler
            emotional_intensity=_seg_emotion(chunks[0], props["emotion_base"] * 1.1),  # hooks more emotive
            has_question="?" in chunks[0],
            has_number=bool(re.search(r'\d', chunks[0])),
            position=0,
            emphasis_level=rng.choice([0, 1, 1, 2]),  # hooks often emphasized
            pacing=_pick_pacing(),
        ),
        AdSegment(
            id="seg_feature_1",
            content=chunks[1],
            segment_type="feature",
            word_count=max(1, len(chunks[1].split())),
            complexity_score=_seg_complexity(chunks[1], props["complexity_base"]),  # body = average complexity
            emotional_intensity=_seg_emotion(chunks[1], props["emotion_base"] * 0.8),  # body less emotive
            has_question="?" in chunks[1],
            has_number=bool(re.search(r'\d', chunks[1])),
            position=1,
            emphasis_level=rng.choice(emphasis_choices),
            pacing=_pick_pacing(),
        ),
        AdSegment(
            id="seg_cta_2",
            content=chunks[2],
            segment_type="cta",
            word_count=max(1, len(chunks[2].split())),
            complexity_score=_seg_complexity(chunks[2], props["complexity_base"] * 0.7),  # CTA simpler
            emotional_intensity=_seg_emotion(chunks[2], props["emotion_base"] * 1.2),  # CTA more emotive
            has_question="?" in chunks[2],
            has_number=bool(re.search(r'\d', chunks[2])),
            position=2,
            emphasis_level=rng.choice([1, 1, 2, 2, 3]),  # CTAs often heavily emphasized
            pacing=rng.choice(["fast", "fast", "medium"]),  # CTAs tend fast
        ),
    ]

    return AdScenario(segments=segments, cta_segment_id="seg_cta_2")


# ─────────────────────────────────────────────────────────────────────────────
# Enhanced simulate_with_noise
# ─────────────────────────────────────────────────────────────────────────────

def simulate_with_strong_noise(
    scenario: AdScenario,
    coefficients: dict | None = None,
    noise_scale: float = 0.12,  # Increased from 0.08 to 0.12
) -> Any:
    """
    Parametric simulation with STRONGER, truly random noise.
    
    Fixes:
    1. Uses time-seeded RNG instead of global random state
    2. Larger noise_scale (0.12 vs 0.08)
    3. Adds extra variation to engagement_score specifically
    4. Varies the attention_flow classification threshold slightly
    """
    from backend.src.simulator import simulate_parametric
    from backend.src.models import CognitiveMetrics
    
    # Fresh seed every call — guaranteed different
    seed = int(time.time() * 10000) % (2**31)
    rng = random.Random(seed)

    base = simulate_parametric(scenario, coefficients=coefficients)

    def _jitter01(value: float, scale: float = noise_scale) -> float:
        return _clamp(value + rng.gauss(0, scale), 0.0, 1.0)

    def _jitter11(value: float, scale: float = noise_scale) -> float:
        return _clamp(value + rng.gauss(0, scale), -1.0, 1.0)

    noisy_attention = [_jitter01(s, noise_scale) for s in base.attention_scores]
    noisy_memory = [_jitter01(s, noise_scale) for s in base.memory_retention]
    noisy_load = _jitter01(base.cognitive_load, noise_scale * 0.8)
    noisy_valence = _jitter11(base.emotional_valence, noise_scale)
    
    # Extra variation in engagement score — this is the headline number
    # Apply both noise and a small random boost/penalty
    engagement_modifier = rng.uniform(-0.06, 0.06)
    noisy_engagement = _clamp(
        _jitter01(base.engagement_score, noise_scale) + engagement_modifier,
        0.0, 1.0
    )
    
    noisy_flow = classify_attention_flow(noisy_attention)

    # Build brain response with noisy values
    from backend.src.simulator import _build_parametric_brain_response
    noisy_brain = _build_parametric_brain_response(
        attention_scores=noisy_attention,
        memory_scores=noisy_memory,
        emotional_valence=noisy_valence,
        load=noisy_load,
    )

    return CognitiveMetrics(
        attention_scores=noisy_attention,
        memory_retention=noisy_memory,
        cognitive_load=noisy_load,
        emotional_valence=noisy_valence,
        engagement_score=noisy_engagement,
        attention_flow=noisy_flow,
        simulation_source="parametric",
        brain_response=noisy_brain,
    )