from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from pydantic import ValidationError
from sqlalchemy import func

from .extensions import db
from .models import Customer, Interaction, Lead, User
from .schemas import CustomerIn, InteractionIn, LoginIn, LeadIn, SignupIn
from .utils_auth import hash_password, verify_password

api = Blueprint("api", __name__, url_prefix="/api")


def _json_error(message: str, status: int = 400, *, details=None):
    payload = {"error": message}
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status


def _require_admin():
    role = (get_jwt() or {}).get("role")
    if role != "admin":
        return _json_error("Admin role required", 403)
    return None


@api.post("/auth/signup")
def signup():
    try:
        data = SignupIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    if User.query.filter((User.username == data.username) | (User.email == data.email)).first():
        return _json_error("Username or email already exists", 409)

    user = User(
        username=data.username,
        email=str(data.email),
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"id": user.id, "username": user.username, "email": user.email, "role": user.role}), 201


@api.post("/auth/login")
def login():
    try:
        data = LoginIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    user = User.query.filter(
        (User.username == data.username_or_email) | (User.email == data.username_or_email)
    ).first()
    if not user or not verify_password(data.password, user.password_hash):
        return _json_error("Invalid credentials", 401)

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username},
        expires_delta=timedelta(hours=12),
    )
    return jsonify(
        {
            "access_token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
        }
    )


@api.get("/me")
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return _json_error("User not found", 404)
    return jsonify({"id": user.id, "username": user.username, "email": user.email, "role": user.role})


# ---- Customers ----


@api.get("/customers")
@jwt_required()
def list_customers():
    q = request.args.get("q")
    query = Customer.query
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)) | (Customer.company.ilike(like)))
    customers = query.order_by(Customer.id.desc()).all()
    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in customers
        ]
    )


@api.post("/customers")
@jwt_required()
def create_customer():
    try:
        data = CustomerIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    c = Customer(name=data.name, email=str(data.email) if data.email else None, phone=data.phone, company=data.company, notes=data.notes)
    db.session.add(c)
    db.session.commit()
    return jsonify({"id": c.id}), 201


@api.put("/customers/<int:customer_id>")
@jwt_required()
def update_customer(customer_id: int):
    c = Customer.query.get(customer_id)
    if not c:
        return _json_error("Customer not found", 404)
    try:
        data = CustomerIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    c.name = data.name
    c.email = str(data.email) if data.email else None
    c.phone = data.phone
    c.company = data.company
    c.notes = data.notes
    db.session.commit()
    return jsonify({"ok": True})


@api.delete("/customers/<int:customer_id>")
@jwt_required()
def delete_customer(customer_id: int):
    c = Customer.query.get(customer_id)
    if not c:
        return _json_error("Customer not found", 404)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True})


# ---- Leads ----


@api.get("/leads")
@jwt_required()
def list_leads():
    status = request.args.get("status")
    assigned_to_id = request.args.get("assigned_to_id")

    query = Lead.query
    if status:
        query = query.filter(Lead.status == status)
    if assigned_to_id:
        query = query.filter(Lead.assigned_to_id == int(assigned_to_id))

    leads = query.order_by(Lead.id.desc()).all()
    return jsonify(
        [
            {
                "id": l.id,
                "customer_id": l.customer_id,
                "customer": {
                    "id": l.customer.id,
                    "name": l.customer.name,
                    "company": l.customer.company,
                    "email": l.customer.email,
                    "phone": l.customer.phone,
                },
                "status": l.status,
                "assigned_to_id": l.assigned_to_id,
                "assigned_to": l.assigned_user.username if l.assigned_user else None,
                "notes": l.notes,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "interactions_count": len(l.interactions),
            }
            for l in leads
        ]
    )


@api.post("/leads")
@jwt_required()
def create_lead():
    try:
        data = LeadIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    if not Customer.query.get(data.customer_id):
        return _json_error("Customer not found", 404)
    if data.assigned_to_id and not User.query.get(data.assigned_to_id):
        return _json_error("Assigned user not found", 404)

    l = Lead(customer_id=data.customer_id, status=data.status, assigned_to_id=data.assigned_to_id, notes=data.notes)
    db.session.add(l)
    db.session.commit()
    return jsonify({"id": l.id}), 201


@api.put("/leads/<int:lead_id>")
@jwt_required()
def update_lead(lead_id: int):
    l = Lead.query.get(lead_id)
    if not l:
        return _json_error("Lead not found", 404)
    try:
        data = LeadIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    if not Customer.query.get(data.customer_id):
        return _json_error("Customer not found", 404)
    if data.assigned_to_id and not User.query.get(data.assigned_to_id):
        return _json_error("Assigned user not found", 404)

    l.customer_id = data.customer_id
    l.status = data.status
    l.assigned_to_id = data.assigned_to_id
    l.notes = data.notes
    db.session.commit()
    return jsonify({"ok": True})


@api.delete("/leads/<int:lead_id>")
@jwt_required()
def delete_lead(lead_id: int):
    l = Lead.query.get(lead_id)
    if not l:
        return _json_error("Lead not found", 404)
    db.session.delete(l)
    db.session.commit()
    return jsonify({"ok": True})


# ---- Interactions ----


@api.get("/interactions")
@jwt_required()
def list_interactions():
    lead_id = request.args.get("lead_id")
    query = Interaction.query
    if lead_id:
        query = query.filter(Interaction.lead_id == int(lead_id))
    interactions = query.order_by(Interaction.date.desc(), Interaction.id.desc()).limit(200).all()
    return jsonify(
        [
            {
                "id": i.id,
                "lead_id": i.lead_id,
                "interaction_type": i.interaction_type,
                "description": i.description,
                "date": i.date.isoformat() if i.date else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in interactions
        ]
    )


@api.post("/interactions")
@jwt_required()
def create_interaction():
    try:
        data = InteractionIn.model_validate(request.get_json() or {})
    except ValidationError as e:
        return _json_error("Invalid input", 422, details=e.errors())

    if not Lead.query.get(data.lead_id):
        return _json_error("Lead not found", 404)
    i = Interaction(
        lead_id=data.lead_id,
        interaction_type=data.interaction_type,
        description=data.description,
        date=data.date or datetime.utcnow(),
    )
    db.session.add(i)
    db.session.commit()
    return jsonify({"id": i.id}), 201


@api.delete("/interactions/<int:interaction_id>")
@jwt_required()
def delete_interaction(interaction_id: int):
    i = Interaction.query.get(interaction_id)
    if not i:
        return _json_error("Interaction not found", 404)
    db.session.delete(i)
    db.session.commit()
    return jsonify({"ok": True})


# ---- Users (admin) ----


@api.get("/users")
@jwt_required()
def list_users():
    admin_err = _require_admin()
    if admin_err:
        return admin_err
    users = User.query.order_by(User.username.asc()).all()
    return jsonify([{"id": u.id, "username": u.username, "email": u.email, "role": u.role} for u in users])


# ---- Dashboard ----


@api.get("/dashboard/stats")
@jwt_required()
def dashboard_stats():
    total_customers = db.session.query(func.count(Customer.id)).scalar() or 0
    total_leads = db.session.query(func.count(Lead.id)).scalar() or 0

    by_status_rows = db.session.query(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    leads_by_status = {status: count for status, count in by_status_rows}

    recent = (
        Interaction.query.order_by(Interaction.date.desc(), Interaction.id.desc())
        .limit(10)
        .all()
    )
    recent_interactions = [
        {
            "id": r.id,
            "lead_id": r.lead_id,
            "interaction_type": r.interaction_type,
            "description": r.description,
            "date": r.date.isoformat() if r.date else None,
        }
        for r in recent
    ]

    return jsonify(
        {
            "total_customers": total_customers,
            "total_leads": total_leads,
            "leads_by_status": leads_by_status,
            "recent_interactions": recent_interactions,
        }
    )


@api.get("/export/leads.csv")
@jwt_required()
def export_leads_csv():
    admin_err = _require_admin()
    if admin_err:
        return admin_err

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "customer_id", "customer_name", "status", "assigned_to", "notes", "created_at"])

    leads = Lead.query.order_by(Lead.id.asc()).all()
    for l in leads:
        writer.writerow(
            [
                l.id,
                l.customer_id,
                l.customer.name if l.customer else "",
                l.status,
                l.assigned_user.username if l.assigned_user else "",
                (l.notes or "").replace("\n", " ").strip(),
                l.created_at.isoformat() if l.created_at else "",
            ]
        )

    bio = io.BytesIO(output.getvalue().encode("utf-8"))
    bio.seek(0)
    return send_file(bio, mimetype="text/csv", as_attachment=True, download_name="leads.csv")

