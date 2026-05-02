# Anomaly Detection Service

This folder contains the local anomaly detection pieces for the donor wallet flow.
It uses a real `scikit-learn` Isolation Forest model saved with `joblib`.

## Generate normal baseline data

```bash
python services/anomaly_detection/mock_data_generator.py --count 3000
```

## Train the baseline model

```bash
python services/anomaly_detection/anomaly_service.py train
```

Training writes:

```text
services/anomaly_detection/model/anomaly_model.json
services/anomaly_detection/model/isolation_forest.joblib
```

## Score one transaction

```bash
python services/anomaly_detection/anomaly_service.py score --transaction-json "{\"project_id\":1,\"milestone_id\":0,\"amount_eth\":150,\"wallet_balance_eth\":151,\"receipt_count_24h\":8,\"release_count_24h\":6,\"hour_of_day\":2,\"day_of_week\":6}"
```

On PowerShell, it is easier to put the transaction into a JSON file and run:

```bash
python services/anomaly_detection/anomaly_service.py score --transaction-file path/to/transaction.json
```

## Run as a local service

```bash
python services/anomaly_detection/anomaly_service.py serve --host 127.0.0.1 --port 5050
```

Then POST transaction JSON to:

```text
http://127.0.0.1:5050/score
```

The Next.js API route `/api/anomaly/score` will call this service when
`ANOMALY_SERVICE_URL=http://127.0.0.1:5050` is set. If the service is not
running, it falls back to calling the local Python model directly.

When the response has `"flagged": true`, the integration should call:

```solidity
raiseAnomalyFlag(projectId, milestoneId, score, reason)
```

The Solidity contract then blocks fund release until the Government/Donor and the assigned Auditor both call:

```solidity
approveAnomalyClearance(projectId, milestoneId)
```
