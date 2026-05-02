import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

const FEATURES = [
  'amount_eth',
  'wallet_balance_eth',
  'amount_to_wallet_ratio',
  'receipt_count_24h',
  'release_count_24h',
  'hour_of_day',
  'day_of_week',
] as const;

type FeatureName = (typeof FEATURES)[number];

interface AnomalyModel {
  model_type?: string;
  feature_stats?: Record<FeatureName, {
    mean: number;
    std: number;
    p05: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
  thresholds: {
    score: number;
    amount_eth_p95: number;
    amount_eth_p99?: number;
    amount_to_wallet_ratio_p95: number;
    amount_to_wallet_ratio_p99?: number;
    receipt_count_24h: number;
    release_count_24h: number;
  };
}

const fallbackModel: AnomalyModel = {
  model_type: 'typescript-calibrated-fallback',
  feature_stats: {
    amount_eth: { mean: 19.5, std: 25, p05: 0.15, p50: 8, p95: 85, p99: 115 },
    wallet_balance_eth: { mean: 92, std: 90, p05: 2, p50: 70, p95: 300, p99: 450 },
    amount_to_wallet_ratio: { mean: 0.33, std: 0.25, p05: 0.03, p50: 0.28, p95: 0.88, p99: 0.98 },
    receipt_count_24h: { mean: 1.4, std: 1, p05: 0, p50: 1, p95: 4, p99: 6 },
    release_count_24h: { mean: 1.2, std: 0.8, p05: 0, p50: 1, p95: 3, p99: 5 },
    hour_of_day: { mean: 13, std: 4, p05: 7, p50: 13, p95: 20, p99: 23 },
    day_of_week: { mean: 3, std: 2, p05: 0, p50: 3, p95: 6, p99: 6 },
  },
  thresholds: {
    score: 70,
    amount_eth_p95: 85,
    amount_eth_p99: 115,
    amount_to_wallet_ratio_p95: 0.88,
    amount_to_wallet_ratio_p99: 0.98,
    receipt_count_24h: 5,
    release_count_24h: 4,
  },
};

const repoRoot = join(process.cwd(), '..');
const serviceScriptPath = join(repoRoot, 'services', 'anomaly_detection', 'anomaly_service.py');
const modelPath = join(repoRoot, 'services', 'anomaly_detection', 'model', 'anomaly_model.json');

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTransaction = (transaction: Record<string, unknown>) => {
  const amount = Math.max(toNumber(transaction.amount_eth), 0);
  const walletBalance = Math.max(toNumber(transaction.wallet_balance_eth), 0.000001);
  const ratio = transaction.amount_to_wallet_ratio === undefined
    ? amount / walletBalance
    : toNumber(transaction.amount_to_wallet_ratio);

  return {
    ...transaction,
    amount_eth: amount,
    wallet_balance_eth: walletBalance,
    amount_to_wallet_ratio: ratio,
    receipt_count_24h: toNumber(transaction.receipt_count_24h),
    release_count_24h: toNumber(transaction.release_count_24h),
    hour_of_day: toNumber(transaction.hour_of_day, new Date().getHours()),
    day_of_week: toNumber(transaction.day_of_week, new Date().getDay()),
  };
};

const loadModel = async (): Promise<AnomalyModel> => {
  try {
    const rawModel = await readFile(modelPath, 'utf-8');
    return JSON.parse(rawModel) as AnomalyModel;
  } catch (error) {
    console.warn('Using fallback anomaly calibration:', error);
    return fallbackModel;
  }
};

const scoreViaConfiguredService = async (transaction: Record<string, unknown>) => {
  const serviceUrl = process.env.ANOMALY_SERVICE_URL;
  if (!serviceUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Anomaly service unavailable, trying local Python model:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const scoreViaPythonModel = async (transaction: Record<string, unknown>) => {
  try {
    const { stdout } = await execFileAsync(
      process.env.ANOMALY_PYTHON || 'python',
      [
        serviceScriptPath,
        'score',
        '--model',
        modelPath,
        '--transaction-json',
        JSON.stringify(transaction),
      ],
      {
        cwd: repoRoot,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      }
    );

    return JSON.parse(stdout);
  } catch (error) {
    console.warn('Local Python anomaly model unavailable, using JS fallback:', error);
    return null;
  }
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

const distanceFromModel = (
  model: AnomalyModel,
  normalized: Record<FeatureName, number>,
) => FEATURES.reduce<Record<string, number>>((scores, feature) => {
  const stats = model.feature_stats?.[feature] || fallbackModel.feature_stats![feature];
  const center = stats.p50 ?? stats.mean;
  const upperSpan = Math.max((stats.p95 ?? stats.mean + stats.std) - center, 0.000001);
  const lowerSpan = Math.max(center - (stats.p05 ?? stats.mean - stats.std), 0.000001);
  const span = normalized[feature] >= center ? upperSpan : lowerSpan;
  scores[feature] = Number((Math.abs(normalized[feature] - center) / span).toFixed(3));
  return scores;
}, {});

const scoreWithFallback = async (transaction: Record<string, unknown>) => {
  const model = await loadModel();
  const normalized = normalizeTransaction(transaction) as Record<FeatureName, number> & Record<string, unknown>;
  const featureScores = distanceFromModel(model, normalized);
  const maxDistance = Math.max(...Object.values(featureScores));
  const thresholds = model.thresholds;
  const reasons: string[] = [];

  const modelScore = Math.round(clamp(((maxDistance - 1.1) / 2.8) * 100, 0, 100));
  let score = Math.min(modelScore, 55);
  const hasReceiptSpike = normalized.receipt_count_24h > thresholds.receipt_count_24h;
  const hasReleaseSpike = normalized.release_count_24h > thresholds.release_count_24h;
  const hasSpike = hasReceiptSpike || hasReleaseSpike;

  if (normalized.amount_eth > (thresholds.amount_eth_p99 ?? thresholds.amount_eth_p95 * 1.35)) {
    reasons.push("release amount is above the model's normal p99 range");
    score = Math.max(score, 62);
  } else if (normalized.amount_eth > thresholds.amount_eth_p95) {
    reasons.push("release amount is above the model's normal p95 range");
    score = Math.max(score, 50);
  }

  if (normalized.amount_to_wallet_ratio > (thresholds.amount_to_wallet_ratio_p99 ?? thresholds.amount_to_wallet_ratio_p95 * 1.12)) {
    reasons.push('release would drain an unusually large share of the donor wallet');
    score = Math.max(score, 92);
  } else if (normalized.amount_to_wallet_ratio > thresholds.amount_to_wallet_ratio_p95) {
    reasons.push('release is high compared with the donor wallet balance');
    score = Math.max(score, 76);
  } else if (normalized.amount_to_wallet_ratio > 0.70) {
    reasons.push('release is high compared with the donor wallet balance');
    score = Math.max(score, 70);
  } else if (normalized.amount_to_wallet_ratio > 0.55 && normalized.amount_eth > thresholds.amount_eth_p95) {
    score = Math.max(score, 65);
  }

  if (
    normalized.amount_eth > (thresholds.amount_eth_p99 ?? thresholds.amount_eth_p95 * 1.35) &&
    normalized.amount_to_wallet_ratio > 0.65
  ) {
    score = Math.max(score, 76);
  }

  if (hasReceiptSpike) {
    reasons.push('receipt submissions spiked in the last 24 hours');
    score = Math.max(score, 72);
  }

  if (hasReleaseSpike) {
    reasons.push('release requests spiked in the last 24 hours');
    score = Math.max(score, 72);
  }

  if (!hasSpike && normalized.amount_to_wallet_ratio <= 0.55) {
    score = Math.min(score, 65);
  }

  const flagged = score >= thresholds.score;

  return {
    flagged,
    score,
    reason: flagged
      ? (reasons.length > 0 ? reasons.join('; ') : 'transaction is unusual compared with the calibrated baseline')
      : 'normal transaction pattern',
    feature_scores: featureScores,
    model_type: model.model_type || fallbackModel.model_type,
    project_id: transaction.project_id,
    milestone_id: transaction.milestone_id,
  };
};

export async function POST(request: NextRequest) {
  try {
    const transaction = normalizeTransaction(await request.json());
    const serviceScore = await scoreViaConfiguredService(transaction);
    if (serviceScore) return NextResponse.json(serviceScore);

    const pythonScore = await scoreViaPythonModel(transaction);
    if (pythonScore) return NextResponse.json(pythonScore);

    return NextResponse.json(await scoreWithFallback(transaction));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Anomaly scoring failed' }, { status: 400 });
  }
}
