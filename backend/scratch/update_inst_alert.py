import os

path = os.path.join(r"anayava\backend\app\routers\institution.py")
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            record_count = db.query(Enrolment.id).filter(
                Enrolment.id.in_(alert.supporting_record_ids),
                Enrolment.institution_id == institution_id,
            ).count()"""

replacement = """            record_count = db.query(Enrolment.id).filter(
                Enrolment.id.in_(alert.supporting_record_ids),
                Enrolment.institution_id.in_(aliases),
            ).count()"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
