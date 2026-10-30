import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from app.admission_categories import normalize_admission_category, student_flags_for_admission_category

ACADEMIC_YEAR_REGEX = re.compile(r"^20\d{2}-20\d{2}$")
VALID_STATUSES = {"Active", "Completed", "Withdrawn", "Suspended"}

class ValidationService:
    """
    Automated Validation Centre:
    Evaluates individual or bulk CSV rows for technical schema compliance, date integrity,
    and provenance before intake/enrolment operations.
    Keeps schema validation issues distinct from regulatory policy conflicts.
    """

    @staticmethod
    def validate_record(record: Dict[str, Any], row_index: Optional[int] = None) -> List[Dict[str, Any]]:
        errors = []
        rec_ref = record.get("student_ref") or f"Row-{row_index or 'Unknown'}"

        # 1. Missing required fields
        required_fields = [
            ("student_ref", "Student Reference"),
            ("apaar_id", "APAAR ID"),
            ("full_name", "Full Name"),
            ("institution_id", "Institution Code"),
            ("programme_id", "Programme Code"),
            ("academic_year", "Academic Year"),
            ("admission_cycle", "Admission Cycle"),
            ("enrolment_start", "Enrolment Start Date"),
            ("enrolment_status", "Enrolment Status")
        ]

        for field_name, label in required_fields:
            val = record.get(field_name)
            if val is None or str(val).strip() == "":
                errors.append({
                    "rule_id": "VAL-REQ-001",
                    "field": field_name,
                    "severity": "CRITICAL",
                    "record_reference": rec_ref,
                    "explanation": f"Missing mandatory field '{label}' ({field_name}).",
                    "suggested_correction": f"Provide a valid non-empty string for {field_name}."
                })

        if "seat_category" in record:
            seat_category = record.get("seat_category")
            normalized_category = normalize_admission_category(seat_category)
            if normalized_category is None:
                errors.append({
                    "rule_id": "VAL-CAT-001",
                    "field": "seat_category",
                    "severity": "ERROR",
                    "record_reference": rec_ref,
                    "explanation": (
                        f"Unsupported admission category '{seat_category}'. Supported values: "
                        "General, SC, ST, OBC, EWS, NRI, OCI, Foreign-National, Supernumerary-TFW."
                    ),
                    "suggested_correction": "Use one of the supported admission-category values exactly.",
                })
            else:
                expected_flags = student_flags_for_admission_category(normalized_category)
                for flag_name, expected in expected_flags.items():
                    provided = record.get(flag_name)
                    explicit_false = provided is False or (
                        isinstance(provided, str) and provided.strip().casefold() in {"false", "0", "no"}
                    )
                    if expected and explicit_false:
                        errors.append({
                            "rule_id": "VAL-CAT-002",
                            "field": flag_name,
                            "severity": "ERROR",
                            "record_reference": rec_ref,
                            "explanation": (
                                f"Admission category '{normalized_category}' conflicts with "
                                f"the explicit {flag_name}=false classification."
                            ),
                            "suggested_correction": "Correct either the admission category or the classification flag.",
                        })

        # 2. Date parsing and validation
        start_date = None
        start_val = record.get("enrolment_start")
        if start_val:
            try:
                if isinstance(start_val, (datetime, date)):
                    start_date = start_val if isinstance(start_val, date) else start_val.date()
                else:
                    start_date = datetime.strptime(str(start_val).strip(), "%Y-%m-%d").date()
            except ValueError:
                errors.append({
                    "rule_id": "VAL-DAT-001",
                    "field": "enrolment_start",
                    "severity": "ERROR",
                    "record_reference": rec_ref,
                    "explanation": f"Invalid start date format '{start_val}'. Required format: YYYY-MM-DD.",
                    "suggested_correction": "Format dates using standard ISO-8601 (e.g. 2025-08-01)."
                })

        end_date = None
        end_val = record.get("enrolment_end")
        if end_val and str(end_val).strip() != "":
            try:
                if isinstance(end_val, (datetime, date)):
                    end_date = end_val if isinstance(end_val, date) else end_val.date()
                else:
                    end_date = datetime.strptime(str(end_val).strip(), "%Y-%m-%d").date()
            except ValueError:
                errors.append({
                    "rule_id": "VAL-DAT-002",
                    "field": "enrolment_end",
                    "severity": "ERROR",
                    "record_reference": rec_ref,
                    "explanation": f"Invalid end date format '{end_val}'. Required format: YYYY-MM-DD.",
                    "suggested_correction": "Format dates using standard ISO-8601 (e.g. 2026-05-31)."
                })

        # 3. End date earlier than start date
        if start_date and end_date:
            if end_date < start_date:
                errors.append({
                    "rule_id": "VAL-DAT-003",
                    "field": "enrolment_end",
                    "severity": "CRITICAL",
                    "record_reference": rec_ref,
                    "explanation": f"End date ({end_date}) is chronologically earlier than start date ({start_date}).",
                    "suggested_correction": "Ensure completion or withdrawal date occurs on or after enrolment start date."
                })

        # 4. Enrolment status validation
        status_val = record.get("enrolment_status")
        if status_val and str(status_val).strip():
            capitalized_status = str(status_val).strip().capitalize()
            if capitalized_status not in VALID_STATUSES:
                errors.append({
                    "rule_id": "VAL-STA-001",
                    "field": "enrolment_status",
                    "severity": "ERROR",
                    "record_reference": rec_ref,
                    "explanation": f"Invalid enrolment status '{status_val}'. Permitted values: {', '.join(sorted(VALID_STATUSES))}.",
                    "suggested_correction": "Set status to one of: Active, Completed, Withdrawn, Suspended."
                })

        # 5. Academic Year format
        acad_val = record.get("academic_year")
        if acad_val and str(acad_val).strip():
            if not ACADEMIC_YEAR_REGEX.match(str(acad_val).strip()):
                errors.append({
                    "rule_id": "VAL-FMT-001",
                    "field": "academic_year",
                    "severity": "WARNING",
                    "record_reference": rec_ref,
                    "explanation": f"Academic year '{acad_val}' does not conform to YYYY-YYYY standard format (e.g. '2025-2026').",
                    "suggested_correction": "Use four-digit span format like 2025-2026."
                })

        # 6. Source provenance
        source_val = record.get("source_submission_id")
        if not source_val or str(source_val).strip() == "":
            errors.append({
                "rule_id": "VAL-PRV-001",
                "field": "source_submission_id",
                "severity": "WARNING",
                "record_reference": rec_ref,
                "explanation": "Missing source batch submission ID or batch provenance tracking metadata.",
                "suggested_correction": "Include a submission identifier (e.g. BATCH-2026-AICTE-01) for audit traceability."
            })

        return errors

    @classmethod
    def validate_dataset(cls, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates a full dataset, tracking individual record errors, duplicate records within the batch,
        and computing overall pass rate.
        """
        all_errors = []
        accepted_count = 0
        rejected_count = 0
        seen_keys = {}

        for idx, rec in enumerate(records):
            rec_errors = cls.validate_record(rec, row_index=idx + 1)
            
            # Duplicate check within batch
            dedup_key = (
                str(rec.get("student_ref", "")).strip(),
                str(rec.get("institution_id", "")).strip(),
                str(rec.get("programme_id", "")).strip(),
                str(rec.get("enrolment_start", "")).strip()
            )
            if dedup_key in seen_keys:
                rec_errors.append({
                    "rule_id": "VAL-DUP-001",
                    "field": "student_ref",
                    "severity": "CRITICAL",
                    "record_reference": rec.get("student_ref", f"Row-{idx+1}"),
                    "explanation": f"Exact duplicate row in batch (identical to row {seen_keys[dedup_key]}).",
                    "suggested_correction": "Deduplicate import dataset before batch processing."
                })
            else:
                seen_keys[dedup_key] = idx + 1

            has_critical_or_error = any(e["severity"] in ("CRITICAL", "ERROR") for e in rec_errors)
            if has_critical_or_error:
                rejected_count += 1
            else:
                accepted_count += 1

            all_errors.extend(rec_errors)

        total = len(records)
        pass_rate = round((accepted_count / total * 100), 2) if total > 0 else 100.0

        return {
            "total_records": total,
            "accepted_count": accepted_count,
            "rejected_count": rejected_count,
            "pass_rate_percent": pass_rate,
            "errors": all_errors,
            "error_count_by_severity": {
                "CRITICAL": sum(1 for e in all_errors if e["severity"] == "CRITICAL"),
                "ERROR": sum(1 for e in all_errors if e["severity"] == "ERROR"),
                "WARNING": sum(1 for e in all_errors if e["severity"] == "WARNING"),
                "INFO": sum(1 for e in all_errors if e["severity"] == "INFO")
            }
        }
