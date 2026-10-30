import pytest

from app.admission_categories import (
    AdmissionCategory,
    REGULAR_CATEGORIES,
    SUPERNUMERARY_CATEGORIES,
    UNCONFIGURED_LIMIT_CATEGORIES,
    normalize_admission_category,
    student_flags_for_admission_category,
)
from app.schemas.enrolment import EnrolmentCreate
from app.services.validation_service import ValidationService


SUPPORTED_CATEGORIES = [category.value for category in AdmissionCategory]


@pytest.mark.parametrize("category", SUPPORTED_CATEGORIES)
def test_all_supported_categories_validate(category):
    errors = ValidationService.validate_record({"student_ref": "STU-CATEGORY", "seat_category": category})

    assert not any(error["rule_id"] == "VAL-CAT-001" for error in errors)
    assert EnrolmentCreate(
        student_ref="STU-CATEGORY",
        apaar_id="MASKED-ID",
        institution_id="INST-1",
        programme_id="PROG-1",
        academic_year="2025-2026",
        admission_cycle="Regular 2025",
        enrolment_start="2025-08-01",
        enrolment_status="Active",
        seat_category=category,
    ).seat_category.value == category


@pytest.mark.parametrize("category", ["Foreign", "Supernumerary-MadeUp", "NRI-OCI", "", "unknown"])
def test_unsupported_categories_are_rejected(category):
    errors = ValidationService.validate_record({"student_ref": "STU-CATEGORY", "seat_category": category})

    assert any(error["rule_id"] == "VAL-CAT-001" for error in errors)
    with pytest.raises(ValueError):
        EnrolmentCreate(
            student_ref="STU-CATEGORY",
            apaar_id="MASKED-ID",
            institution_id="INST-1",
            programme_id="PROG-1",
            academic_year="2025-2026",
            admission_cycle="Regular 2025",
            enrolment_start="2025-08-01",
            enrolment_status="Active",
            seat_category=category,
        )


def test_category_classification_is_exact_and_groups_are_non_overlapping():
    assert normalize_admission_category(" general ") == AdmissionCategory.GENERAL.value
    assert normalize_admission_category("Foreign National") is None
    assert AdmissionCategory.NRI.value not in REGULAR_CATEGORIES
    assert AdmissionCategory.NRI.value not in SUPERNUMERARY_CATEGORIES
    assert AdmissionCategory.SUPERNUMERARY_TFW.value in SUPERNUMERARY_CATEGORIES
    assert UNCONFIGURED_LIMIT_CATEGORIES == {"OCI", "Foreign-National"}
    assert student_flags_for_admission_category("NRI") == {
        "is_nri": True,
        "is_oci": False,
        "is_foreign_national": False,
    }
    assert student_flags_for_admission_category("Foreign-National")["is_foreign_national"] is True
    assert student_flags_for_admission_category("OCI") == {
        "is_nri": False,
        "is_oci": True,
        "is_foreign_national": False,
    }


def test_admission_category_conflicting_with_explicit_student_flag_is_rejected():
    errors = ValidationService.validate_record({
        "student_ref": "STU-CATEGORY",
        "seat_category": "NRI",
        "is_nri": False,
    })

    assert any(error["rule_id"] == "VAL-CAT-002" for error in errors)