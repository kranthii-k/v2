#!/usr/bin/env python3
"""
Generate baseline "normal" transaction data for the anomaly detection service.

The generated data represents realistic local-demo NGO fund requests: a mixture
of small reimbursements, medium releases, and larger approved disbursements.
The anomaly model should therefore flag unusual patterns, not every non-tiny
transaction.
"""

from __future__ import annotations

import argparse
import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4


DEFAULT_DONOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
DEFAULT_NGO = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
DEFAULT_AUDITOR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"


FIELDS = [
    "tx_id",
    "timestamp",
    "project_id",
    "milestone_id",
    "donor_address",
    "ngo_address",
    "auditor_address",
    "amount_eth",
    "wallet_balance_eth",
    "amount_to_wallet_ratio",
    "receipt_count_24h",
    "release_count_24h",
    "hour_of_day",
    "day_of_week",
    "label",
]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def weighted_amount() -> float:
    bucket = random.random()

    if bucket < 0.55:
        return clamp(random.lognormvariate(0.15, 0.9), 0.02, 15.0)

    if bucket < 0.9:
        return clamp(random.lognormvariate(2.6, 0.65), 3.0, 80.0)

    return clamp(random.gauss(72.0, 18.0), 25.0, 120.0)


def weighted_ratio() -> float:
    bucket = random.random()

    if bucket < 0.72:
        return clamp(random.betavariate(2.0, 5.5), 0.02, 0.55)

    if bucket < 0.94:
        return clamp(random.betavariate(3.0, 3.0), 0.25, 0.82)

    return clamp(random.gauss(0.88, 0.08), 0.65, 0.98)


def generate_rows(count: int, seed: int) -> list[dict[str, object]]:
    random.seed(seed)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    rows: list[dict[str, object]] = []

    for _ in range(count):
        timestamp = now - timedelta(
            days=random.randint(0, 45),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )
        timestamp = timestamp.replace(hour=random.choices(
            population=list(range(24)),
            weights=[1, 1, 1, 1, 1, 1, 2, 4, 8, 12, 14, 14, 13, 13, 12, 12, 11, 9, 6, 4, 3, 2, 1, 1],
            k=1,
        )[0])

        amount = weighted_amount()
        ratio = weighted_ratio()
        wallet_balance = clamp(amount / ratio, amount + 0.01, 500.0)
        ratio = amount / wallet_balance

        rows.append(
            {
                "tx_id": str(uuid4()),
                "timestamp": timestamp.isoformat(),
                "project_id": random.randint(1, 50),
                "milestone_id": random.randint(0, 4),
                "donor_address": DEFAULT_DONOR,
                "ngo_address": DEFAULT_NGO,
                "auditor_address": DEFAULT_AUDITOR,
                "amount_eth": f"{amount:.6f}",
                "wallet_balance_eth": f"{wallet_balance:.6f}",
                "amount_to_wallet_ratio": f"{ratio:.6f}",
                "receipt_count_24h": random.choices([0, 1, 2, 3, 4], [8, 40, 34, 14, 4], k=1)[0],
                "release_count_24h": random.choices([0, 1, 2, 3], [10, 55, 28, 7], k=1)[0],
                "hour_of_day": timestamp.hour,
                "day_of_week": timestamp.weekday(),
                "label": "normal",
            }
        )

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate normal transaction baseline CSV data.")
    parser.add_argument("--output", default="services/anomaly_detection/data/normal_transactions.csv")
    parser.add_argument("--count", type=int, default=3000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = generate_rows(args.count, args.seed)
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} normal baseline transactions to {output_path}")


if __name__ == "__main__":
    main()
