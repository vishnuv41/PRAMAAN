from enum import Enum
from typing import Optional


class AdmissionCategory(str, Enum):
    GENERAL = "General"
    SC = "SC"
    ST = "ST"
    OBC = "OBC"
    EWS = "EWS"
    NRI = "NRI"
    OCI = "OCI"
    FOREIGN_NATIONAL = "Foreign-National"
    SUPERNUMERARY_TFW = "Supernumerary-TFW"


REGULAR_CATEGORIES = frozenset({
    AdmissionCategory.GENERAL.value,
    AdmissionCategory.SC.value,
    AdmissionCategory.ST.value,
    AdmissionCategory.OBC.value,
    AdmissionCategory.EWS.value,
})
SUPERNUMERARY_CATEGORIES = frozenset({AdmissionCategory.SUPERNUMERARY_TFW.value})
UNCONFIGURED_LIMIT_CATEGORIES = frozenset({
    AdmissionCategory.OCI.value,
    AdmissionCategory.FOREIGN_NATIONAL.value,
})

_CATEGORY_BY_CASEFOLD = {category.value.casefold(): category for category in AdmissionCategory}


def normalize_admission_category(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    category = _CATEGORY_BY_CASEFOLD.get(value.strip().casefold())
    return category.value if category else None


def student_flags_for_admission_category(category: Optional[str]) -> dict[str, bool]:
    """Map only explicit matching categories; do not infer legal status from text."""
    return {
        "is_nri": category == AdmissionCategory.NRI.value,
        "is_oci": category == AdmissionCategory.OCI.value,
        "is_foreign_national": category == AdmissionCategory.FOREIGN_NATIONAL.value,
    }