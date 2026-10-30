import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.intake import HistoricalIntake

class HistoricalAnomalyService:
    """
    Explainable statistical baseline for detecting unusual shifts in institutional admissions.
    Visible anomaly methods:
    1. Z-score on Year-on-Year change against 5-year moving window (|Z| >= 2.0).
    2. Interquartile Range (IQR) comparison against peer institutions offering the same programme.
    3. Reviewer dismissal workflow allowing officers to document legitimate expansions or closures.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_historical_trends(self, institution_id: str, programme_id: str) -> Dict[str, Any]:
        rows: List[HistoricalIntake] = self.db.query(HistoricalIntake).filter(
            HistoricalIntake.institution_id == institution_id,
            HistoricalIntake.programme_id == programme_id
        ).order_by(HistoricalIntake.academic_year.asc()).all()

        if not rows:
            return {"institution_id": institution_id, "programme_id": programme_id, "history": []}

        counts = [r.admitted_count for r in rows]
        baseline_rows = rows[:-1] if len(rows) > 1 and rows[-1].is_anomaly else rows
        baseline_counts = [r.admitted_count for r in baseline_rows]

        # A flagged latest observation must not dilute its own comparison baseline.
        mean_val = sum(baseline_counts) / len(baseline_counts)
        variance = sum((x - mean_val) ** 2 for x in baseline_counts) / (len(baseline_counts) if len(baseline_counts) > 1 else 1)
        std_dev = math.sqrt(variance)

        history_items = []
        for idx, r in enumerate(rows):
            prev_val = counts[idx - 1] if idx > 0 else r.admitted_count
            pct_change = round(((r.admitted_count - prev_val) / prev_val * 100), 1) if prev_val > 0 else 0.0
            z = round((r.admitted_count - mean_val) / std_dev, 2) if std_dev > 0 else 0.0

            history_items.append({
                "id": r.id,
                "academic_year": r.academic_year,
                "admitted_count": r.admitted_count,
                "approved_intake": r.approved_intake,
                "pct_change": pct_change,
                "z_score": z,
                "is_anomaly": r.is_anomaly,
                "iqr_status": r.iqr_status,
                "peer_group_iqr_diff": r.peer_group_iqr_diff,
                "dismissed": r.dismissed,
                "dismissal_reason": r.dismissal_reason,
                "ground_truth": r.ground_truth,
                "explanation": r.anomaly_explanation
            })

        latest = history_items[-1] if history_items else None
        current_count = rows[-1].admitted_count if rows else None
        baseline_min = min(baseline_counts) if baseline_counts else None
        baseline_max = max(baseline_counts) if baseline_counts else None
        comparison_explanation = None
        if current_count is not None and baseline_counts:
            comparison_explanation = (
                f"Current reported enrolment is {current_count} students, compared with a "
                f"historical range of {baseline_min}–{baseline_max} students. "
                "This deviation may warrant review."
            )

        return {
            "institution_id": institution_id,
            "institution_name": rows[0].institution_name,
            "programme_id": programme_id,
            "programme_name": rows[0].programme_name,
            "baseline_mean": round(mean_val, 1),
            "baseline_std": round(std_dev, 1),
            "baseline_sample_size": len(baseline_counts),
            "baseline_values": baseline_counts,
            "historical_range": {"minimum": baseline_min, "maximum": baseline_max},
            "current_reported_enrolment": current_count,
            "deviation_from_baseline_mean": round(current_count - mean_val, 1) if current_count is not None else None,
            "comparison_explanation": comparison_explanation,
            "detection_method": "Multi-tier: Z-Score (|Z| >= 2.0) & Peer IQR Comparison",
            "history": history_items,
            "latest_record": latest
        }

    def get_all_anomalies(self) -> List[Dict[str, Any]]:
        anomalies = self.db.query(HistoricalIntake).filter(HistoricalIntake.is_anomaly == True).all()
        return [
            {
                "id": a.id,
                "institution_id": a.institution_id,
                "institution_name": a.institution_name,
                "programme_id": a.programme_id,
                "programme_name": a.programme_name,
                "academic_year": a.academic_year,
                "admitted_count": a.admitted_count,
                "approved_intake": a.approved_intake,
                "pct_change": a.pct_change,
                "z_score": a.z_score,
                "iqr_status": a.iqr_status,
                "dismissed": a.dismissed,
                "dismissed_by": a.dismissed_by,
                "dismissed_at": a.dismissed_at.isoformat() if a.dismissed_at else None,
                "dismissal_reason": a.dismissal_reason,
                "ground_truth": a.ground_truth,
                "explanation": a.anomaly_explanation
            }
            for a in anomalies
        ]

    def dismiss_anomaly(self, anomaly_id: int, reason: str, dismissed_by: str) -> Dict[str, Any]:
        item = self.db.query(HistoricalIntake).filter(HistoricalIntake.id == anomaly_id).first()
        if not item:
            raise ValueError(f"Historical record {anomaly_id} not found.")

        item.dismissed = True
        item.dismissed_by = dismissed_by or "AICTE Officer (Regional Office)"
        item.dismissed_at = datetime.utcnow()
        item.dismissal_reason = reason
        self.db.commit()
        self.db.refresh(item)
        return {
            "success": True,
            "id": item.id,
            "dismissed": True,
            "reason": item.dismissal_reason,
            "dismissed_by": item.dismissed_by
        }

    def compute_synthetic_benchmark_metrics(self) -> Dict[str, Any]:
        records = self.db.query(HistoricalIntake).all()
        if not records:
            return {"total": 0, "metrics_available": False}

        tp = 0
        fp = 0
        tn = 0
        fn = 0

        for r in records:
            actual_is_anomaly = (r.ground_truth == "ANOMALY")
            pred_is_anomaly = bool(r.is_anomaly)

            if pred_is_anomaly and actual_is_anomaly:
                tp += 1
            elif pred_is_anomaly and not actual_is_anomaly:
                fp += 1
            elif not pred_is_anomaly and not actual_is_anomaly:
                tn += 1
            elif not pred_is_anomaly and actual_is_anomaly:
                fn += 1

        precision = round((tp / (tp + fp)), 3) if (tp + fp) > 0 else 0.0
        recall = round((tp / (tp + fn)), 3) if (tp + fn) > 0 else 0.0
        fpr = round((fp / (fp + tn)), 3) if (fp + tn) > 0 else 0.0
        accuracy = round(((tp + tn) / (tp + tn + fp + fn)), 3) if (tp + tn + fp + fn) > 0 else 0.0

        return {
            "dataset": "AICTE Synthetic Historical Multi-Year Benchmark (Fictional)",
            "metrics_available": True,
            "confusion_matrix": {
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn,
                "total_samples": len(records)
            },
            "metrics": {
                "precision": precision,
                "recall": recall,
                "false_positive_rate": fpr,
                "accuracy": accuracy
            },
            "methodology": "Two-tailed Z-score deviation against 5-year moving window (|z| >= 2.0) with peer IQR validation"
        }
