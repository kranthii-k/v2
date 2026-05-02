#!/usr/bin/env python3
"""
Isolation Forest anomaly detection service for NGO fund-release requests.

Commands:
1. Train from a normal transaction CSV.
2. Score one transaction JSON payload.
3. Serve /health and /score over HTTP for the frontend.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from statistics import mean, pstdev
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler


FEATURES = [
    "amount_eth",
    "wallet_balance_eth",
    "amount_to_wallet_ratio",
    "receipt_count_24h",
    "release_count_24h",
    "hour_of_day",
    "day_of_week",
]

DEFAULT_MODEL_PATH = Path("services/anomaly_detection/model/anomaly_model.json")
DEFAULT_SKLEARN_MODEL = "isolation_forest.joblib"


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except (TypeError, ValueError):
        return default


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        return 0.0

    index = (len(values) - 1) * quantile
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return values[int(index)]

    return values[lower] + (values[upper] - values[lower]) * (index - lower)


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def rows_to_matrix(rows: list[dict[str, Any]]) -> np.ndarray:
    return np.array(
        [[safe_float(row.get(feature)) for feature in FEATURES] for row in rows],
        dtype=float,
    )


def normalize_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    amount = max(safe_float(transaction.get("amount_eth")), 0.0)
    wallet_balance = max(safe_float(transaction.get("wallet_balance_eth")), 0.000001)
    ratio = transaction.get("amount_to_wallet_ratio")

    if ratio is None:
        ratio = amount / wallet_balance

    normalized = dict(transaction)
    normalized["amount_eth"] = amount
    normalized["wallet_balance_eth"] = wallet_balance
    normalized["amount_to_wallet_ratio"] = safe_float(ratio)
    normalized["receipt_count_24h"] = safe_float(transaction.get("receipt_count_24h"))
    normalized["release_count_24h"] = safe_float(transaction.get("release_count_24h"))
    normalized["hour_of_day"] = safe_float(transaction.get("hour_of_day"))
    normalized["day_of_week"] = safe_float(transaction.get("day_of_week"))
    return normalized


def train_model(baseline_path: Path, model_path: Path) -> dict[str, Any]:
    rows = load_csv_rows(baseline_path)
    if not rows:
        raise ValueError(f"No rows found in {baseline_path}")

    matrix = rows_to_matrix(rows)
    pipeline = Pipeline(
        steps=[
            ("scaler", RobustScaler()),
            (
                "isolation_forest",
                IsolationForest(
                    n_estimators=300,
                    contamination=0.06,
                    max_samples="auto",
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(matrix)

    decision_scores = sorted(float(score) for score in pipeline.decision_function(matrix))
    amount_values = sorted(safe_float(row.get("amount_eth")) for row in rows)
    ratio_values = sorted(safe_float(row.get("amount_to_wallet_ratio")) for row in rows)

    stats: dict[str, dict[str, float]] = {}
    for index, feature in enumerate(FEATURES):
        values = sorted(float(row[index]) for row in matrix)
        stats[feature] = {
            "mean": mean(values),
            "std": pstdev(values) or 1.0,
            "p05": percentile(values, 0.05),
            "p50": percentile(values, 0.50),
            "p95": percentile(values, 0.95),
            "p99": percentile(values, 0.99),
        }

    sklearn_model_path = model_path.parent / DEFAULT_SKLEARN_MODEL
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, sklearn_model_path)

    model = {
        "version": 2,
        "model_type": "sklearn.isolation_forest",
        "features_order": FEATURES,
        "sklearn_model_path": DEFAULT_SKLEARN_MODEL,
        "feature_stats": stats,
        "score_calibration": {
            "normal_score": percentile(decision_scores, 0.50),
            "flag_score": percentile(decision_scores, 0.06),
            "high_risk_score": percentile(decision_scores, 0.02),
        },
        "thresholds": {
            "score": 70,
            "amount_eth_p95": percentile(amount_values, 0.95),
            "amount_eth_p99": percentile(amount_values, 0.99),
            "amount_to_wallet_ratio_p95": percentile(ratio_values, 0.95),
            "amount_to_wallet_ratio_p99": percentile(ratio_values, 0.99),
            "receipt_count_24h": 5,
            "release_count_24h": 4,
        },
    }

    model_path.write_text(json.dumps(model, indent=2), encoding="utf-8")
    return model


def load_model(path: Path) -> dict[str, Any]:
    model = json.loads(path.read_text(encoding="utf-8"))
    sklearn_path = Path(model.get("sklearn_model_path", DEFAULT_SKLEARN_MODEL))

    if not sklearn_path.is_absolute():
        sklearn_path = path.parent / sklearn_path

    model["_pipeline"] = joblib.load(sklearn_path)
    return model


def risk_score_from_decision(model: dict[str, Any], decision_score: float) -> int:
    calibration = model["score_calibration"]
    normal_score = float(calibration["normal_score"])
    flag_score = float(calibration["flag_score"])
    high_risk_score = float(calibration["high_risk_score"])

    if decision_score >= normal_score:
        return 0

    if decision_score <= high_risk_score:
        return 100

    if decision_score <= flag_score:
        span = max(flag_score - high_risk_score, 0.000001)
        return int(round(70 + ((flag_score - decision_score) / span) * 30))

    span = max(normal_score - flag_score, 0.000001)
    return int(round(((normal_score - decision_score) / span) * 69))


def contextual_risk_score(model: dict[str, Any], normalized: dict[str, Any], decision_score: float) -> int:
    thresholds = model["thresholds"]
    model_score = risk_score_from_decision(model, decision_score)
    amount = normalized["amount_eth"]
    ratio = normalized["amount_to_wallet_ratio"]
    receipt_spike = normalized["receipt_count_24h"] > thresholds["receipt_count_24h"]
    release_spike = normalized["release_count_24h"] > thresholds["release_count_24h"]
    has_spike = receipt_spike or release_spike

    amount_p95 = thresholds["amount_eth_p95"]
    amount_p99 = thresholds["amount_eth_p99"]
    ratio_p95 = thresholds["amount_to_wallet_ratio_p95"]
    ratio_p99 = thresholds["amount_to_wallet_ratio_p99"]

    score = min(model_score, 55)

    if amount > amount_p99:
        score = max(score, 62)
    elif amount > amount_p95:
        score = max(score, 50)

    if ratio > ratio_p99:
        score = max(score, 92)
    elif ratio > ratio_p95:
        score = max(score, 76)
    elif ratio > 0.70:
        score = max(score, 70)
    elif ratio > 0.55 and amount > amount_p95:
        score = max(score, 65)

    if amount > amount_p99 and ratio > 0.65:
        score = max(score, 76)

    if receipt_spike:
        score = max(score, 72)

    if release_spike:
        score = max(score, 72)

    if not has_spike and ratio <= 0.55:
        score = min(score, 65)

    return min(100, int(round(score)))


def feature_distances(model: dict[str, Any], normalized: dict[str, Any]) -> dict[str, float]:
    distances: dict[str, float] = {}
    for feature in FEATURES:
        stats = model["feature_stats"][feature]
        value = safe_float(normalized.get(feature))
        center = float(stats["p50"])
        upper_span = max(float(stats["p95"]) - center, 0.000001)
        lower_span = max(center - float(stats["p05"]), 0.000001)
        span = upper_span if value >= center else lower_span
        distances[feature] = round(abs(value - center) / span, 3)
    return distances


def build_reasons(model: dict[str, Any], normalized: dict[str, Any], feature_scores: dict[str, float]) -> list[str]:
    thresholds = model["thresholds"]
    reasons: list[str] = []

    if normalized["amount_eth"] > thresholds["amount_eth_p99"]:
        reasons.append("release amount is above the model's normal p99 range")
    elif normalized["amount_eth"] > thresholds["amount_eth_p95"]:
        reasons.append("release amount is above the model's normal p95 range")

    if normalized["amount_to_wallet_ratio"] > thresholds["amount_to_wallet_ratio_p99"]:
        reasons.append("release would drain an unusually large share of the donor wallet")
    elif normalized["amount_to_wallet_ratio"] > thresholds["amount_to_wallet_ratio_p95"]:
        reasons.append("release is high compared with the donor wallet balance")

    if normalized["receipt_count_24h"] > thresholds["receipt_count_24h"]:
        reasons.append("receipt submissions spiked in the last 24 hours")

    if normalized["release_count_24h"] > thresholds["release_count_24h"]:
        reasons.append("release requests spiked in the last 24 hours")

    if not reasons:
        strongest_feature = max(feature_scores, key=feature_scores.get)
        reasons.append(f"Isolation Forest marked this request unusual, strongest signal: {strongest_feature}")

    return reasons


def score_transaction(model: dict[str, Any], transaction: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_transaction(transaction)
    matrix = np.array([[normalized[feature] for feature in FEATURES]], dtype=float)
    decision_score = float(model["_pipeline"].decision_function(matrix)[0])
    feature_scores = feature_distances(model, normalized)
    score = contextual_risk_score(model, normalized, decision_score)
    flagged = score >= model["thresholds"]["score"]
    reasons = build_reasons(model, normalized, feature_scores) if flagged else []

    return {
        "flagged": flagged,
        "score": score,
        "reason": "; ".join(reasons) if reasons else "normal transaction pattern",
        "feature_scores": feature_scores,
        "model_type": model.get("model_type", "sklearn.isolation_forest"),
        "decision_score": round(decision_score, 6),
        "project_id": normalized.get("project_id"),
        "milestone_id": normalized.get("milestone_id"),
    }


class AnomalyRequestHandler(BaseHTTPRequestHandler):
    model: dict[str, Any] = {}

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json({"ok": True, "model_type": self.model.get("model_type")})
            return

        self._send_json({"error": "not found"}, 404)

    def do_POST(self) -> None:
        if self.path != "/score":
            self._send_json({"error": "not found"}, 404)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)

        try:
            transaction = json.loads(raw_body.decode("utf-8"))
            result = score_transaction(self.model, transaction)
            self._send_json(result)
        except Exception as error:
            self._send_json({"error": str(error)}, 400)


def run_server(model_path: Path, host: str, port: int) -> None:
    AnomalyRequestHandler.model = load_model(model_path)
    server = HTTPServer((host, port), AnomalyRequestHandler)
    print(f"Anomaly service running at http://{host}:{port}")
    print("POST transaction JSON to /score")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Train, score, or serve anomaly detection.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    train_parser = subparsers.add_parser("train")
    train_parser.add_argument("--baseline", default="services/anomaly_detection/data/normal_transactions.csv")
    train_parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH))

    score_parser = subparsers.add_parser("score")
    score_parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH))
    score_input = score_parser.add_mutually_exclusive_group(required=True)
    score_input.add_argument("--transaction-json")
    score_input.add_argument("--transaction-file")

    serve_parser = subparsers.add_parser("serve")
    serve_parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH))
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=5050)

    args = parser.parse_args()

    if args.command == "train":
        model = train_model(Path(args.baseline), Path(args.model))
        print(json.dumps({
            "model": args.model,
            "model_type": model["model_type"],
            "thresholds": model["thresholds"],
            "sklearn_model": model["sklearn_model_path"],
        }, indent=2))
    elif args.command == "score":
        model = load_model(Path(args.model))
        if args.transaction_file:
            transaction = json.loads(Path(args.transaction_file).read_text(encoding="utf-8"))
        else:
            transaction = json.loads(args.transaction_json)
        print(json.dumps(score_transaction(model, transaction), indent=2))
    elif args.command == "serve":
        run_server(Path(args.model), args.host, args.port)


if __name__ == "__main__":
    main()
