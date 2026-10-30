import os

path = os.path.join(r"anayava\backend\app\routers\institution.py")
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = """from app.security import Principal, enforce_institution_scope, mask_identifier, get_current_principal"""
replacement1 = """from app.security import Principal, enforce_institution_scope, get_institution_aliases, mask_identifier, get_current_principal"""

target2 = """    # 1. Total student count in this institution
    inst_enrolments = db.query(Enrolment).filter(Enrolment.institution_id == institution_id)
    if academic_year:
        inst_enrolments = inst_enrolments.filter(Enrolment.academic_year == academic_year)

    enrolment_records = inst_enrolments.all()
    total_enrolments = len(enrolment_records)
    active_students = sum(1 for e in enrolment_records if e.enrolment_status == "Active")
    completed_students = sum(1 for e in enrolment_records if e.enrolment_status == "Completed")
    withdrawn_students = sum(1 for e in enrolment_records if e.enrolment_status == "Withdrawn")

    # 2. Approved Intake utilization for this college
    rules = db.query(ApprovedIntake).filter(
        ApprovedIntake.institution_id == institution_id,
        ApprovedIntake.academic_year == academic_year
    ).all()

    intake_status = []
    total_sanctioned = 0
    total_new_admitted = 0
    for r in rules:
        admitted = db.query(func.count(Enrolment.id)).filter(
            Enrolment.institution_id == institution_id,
            Enrolment.programme_id == r.programme_id,
            Enrolment.academic_year == academic_year
        ).scalar() or 0"""

replacement2 = """    aliases = get_institution_aliases(institution_id) or [institution_id]
    # 1. Total student count in this institution
    inst_enrolments = db.query(Enrolment).filter(Enrolment.institution_id.in_(aliases))
    if academic_year:
        inst_enrolments = inst_enrolments.filter(Enrolment.academic_year == academic_year)

    enrolment_records = inst_enrolments.all()
    total_enrolments = len(enrolment_records)
    active_students = sum(1 for e in enrolment_records if e.enrolment_status == "Active")
    completed_students = sum(1 for e in enrolment_records if e.enrolment_status == "Completed")
    withdrawn_students = sum(1 for e in enrolment_records if e.enrolment_status == "Withdrawn")

    # 2. Approved Intake utilization for this college
    rules = db.query(ApprovedIntake).filter(
        ApprovedIntake.institution_id.in_(aliases),
        ApprovedIntake.academic_year == academic_year
    ).all()

    intake_status = []
    total_sanctioned = 0
    total_new_admitted = 0
    for r in rules:
        admitted = db.query(func.count(Enrolment.id)).filter(
            Enrolment.institution_id.in_(aliases),
            Enrolment.programme_id == r.programme_id,
            Enrolment.academic_year == academic_year
        ).scalar() or 0"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1, 1).replace(target2, replacement2, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
