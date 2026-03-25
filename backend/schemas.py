from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Literal["admin", "sales"] = "sales"


class LoginIn(BaseModel):
    username_or_email: str
    password: str


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = None


class LeadIn(BaseModel):
    customer_id: int
    status: Literal["new", "contacted", "qualified", "proposal", "won", "lost"] = "new"
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None


class InteractionIn(BaseModel):
    lead_id: int
    interaction_type: Literal["note", "call", "email"]
    description: str = Field(min_length=1)
    date: Optional[datetime] = None

