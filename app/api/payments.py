"""
Greenlit — Payments API

Stripe (global) + Razorpay (India, detected by CF-IPCountry header or ?country=IN).

Endpoints:
  POST /api/payments/checkout    → creates Stripe OR Razorpay session
  POST /api/payments/portal      → Stripe customer portal (manage/cancel)
  POST /api/payments/razorpay/verify   → verify Razorpay payment signature
  POST /api/payments/stripe/webhook    → Stripe webhook (plan upgrade/downgrade)
  POST /api/payments/razorpay/webhook  → Razorpay webhook (subscription events)
  GET  /api/payments/plan              → current user plan + limits

Plan limits:
  free:    1 repo, public only, no monitoring, no DAST probe, no auto-fix
  starter: 3 repos, private repos, monitoring, email alerts
  builder: unlimited repos, DAST probe, auto-fix PRs, priority support
"""
import hashlib
import hmac
import json
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.config import (
    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER_USD, STRIPE_PRICE_BUILDER_USD,
    STRIPE_PRICE_STARTER_INR, STRIPE_PRICE_BUILDER_INR,
    RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
    RAZORPAY_PLAN_STARTER, RAZORPAY_PLAN_BUILDER,
    FRONTEND_URL,
)
from app.database import get_user_by_id, update_user_plan, upsert_user

router = APIRouter()

PLAN_LIMITS = {
    "free":    {"repos": 1, "private_repos": False, "monitoring": False, "dast": False, "autofix": False},
    "starter": {"repos": 3, "private_repos": True,  "monitoring": True,  "dast": False, "autofix": False},
    "builder": {"repos": 999, "private_repos": True, "monitoring": True, "dast": True,  "autofix": True},
}

PRICES = {
    "starter": {"usd": 700,   "inr": 29900,  "usd_display": "$7",   "inr_display": "₹299"},
    "builder": {"usd": 2900,  "inr": 99900,  "usd_display": "$29",  "inr_display": "₹999"},
}


def _stripe():
    if not STRIPE_SECRET_KEY:
        return None
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = STRIPE_SECRET_KEY
        return _stripe_lib
    except ImportError:
        return None


def _razorpay():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    try:
        import razorpay
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except ImportError:
        return None


def _detect_country(request: Request, override: str = "") -> str:
    if override:
        return override.upper()
    return request.headers.get("CF-IPCountry", request.headers.get("X-Country", "US")).upper()


def _get_stripe_price_id(plan: str, country: str) -> Optional[str]:
    if country == "IN":
        return STRIPE_PRICE_STARTER_INR if plan == "starter" else STRIPE_PRICE_BUILDER_INR
    return STRIPE_PRICE_STARTER_USD if plan == "starter" else STRIPE_PRICE_BUILDER_USD


# ─────────────────────────────────────────────────
# Request models
# ─────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    user_id: str
    plan: str  # "starter" | "builder"
    country: str = ""  # optional override; detected from CF-IPCountry otherwise
    success_url: str = ""
    cancel_url: str = ""


class RazorpayVerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    user_id: str
    plan: str


class PortalRequest(BaseModel):
    user_id: str
    return_url: str = ""


# ─────────────────────────────────────────────────
# GET /plan — current user plan
# ─────────────────────────────────────────────────

@router.get("/plan")
async def get_plan(user_id: str):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = user.get("plan", "free")
    return {
        "plan": plan,
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
        "razorpay_available": bool(RAZORPAY_KEY_ID),
        "stripe_available": bool(STRIPE_SECRET_KEY),
    }


# ─────────────────────────────────────────────────
# POST /checkout — Stripe or Razorpay session
# ─────────────────────────────────────────────────

@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, request: Request):
    if body.plan not in ("starter", "builder"):
        raise HTTPException(status_code=422, detail="plan must be 'starter' or 'builder'")

    country = _detect_country(request, body.country)
    success_url = body.success_url or f"{FRONTEND_URL}/dashboard?upgraded=1"
    cancel_url = body.cancel_url or f"{FRONTEND_URL}/pricing?cancelled=1"

    # India → prefer Razorpay (lower fees, UPI support, no card friction)
    if country == "IN" and RAZORPAY_KEY_ID:
        return await _razorpay_subscription(body.user_id, body.plan)

    # Global → Stripe
    stripe = _stripe()
    if not stripe:
        # No Stripe keys — return demo URL so UI doesn't crash
        return {
            "provider": "demo",
            "url": f"{FRONTEND_URL}/pricing?demo=1&plan={body.plan}",
            "message": "Stripe not configured. Add STRIPE_SECRET_KEY to .env",
        }

    price_id = _get_stripe_price_id(body.plan, country)
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Stripe price ID for {body.plan}/{country} not configured. Set STRIPE_PRICE_{body.plan.upper()}_{'INR' if country=='IN' else 'USD'} in .env")

    user = get_user_by_id(body.user_id)
    customer_id = user.get("stripe_customer_id") if user else None

    session_params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{success_url}&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": cancel_url,
        "client_reference_id": body.user_id,
        "metadata": {"plan": body.plan, "user_id": body.user_id},
        "allow_promotion_codes": True,
        "billing_address_collection": "auto",
    }
    if customer_id:
        session_params["customer"] = customer_id

    try:
        session = stripe.checkout.Session.create(**session_params)
        return {"provider": "stripe", "url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


async def _razorpay_subscription(user_id: str, plan: str) -> dict:
    rz = _razorpay()
    if not rz:
        return {
            "provider": "demo",
            "url": f"{FRONTEND_URL}/pricing?demo=1&plan={plan}",
            "message": "Razorpay not configured",
        }

    plan_id = RAZORPAY_PLAN_STARTER if plan == "starter" else RAZORPAY_PLAN_BUILDER
    if not plan_id:
        return {
            "provider": "razorpay_manual",
            "key_id": RAZORPAY_KEY_ID,
            "amount": PRICES[plan]["inr"],
            "currency": "INR",
            "plan": plan,
            "message": "Create Razorpay subscription plans in dashboard, then set RAZORPAY_PLAN_STARTER/BUILDER",
        }

    try:
        sub = rz.subscription.create({
            "plan_id": plan_id,
            "customer_notify": 1,
            "quantity": 1,
            "total_count": 12,
            "notes": {"user_id": user_id, "plan": plan},
        })
        return {
            "provider": "razorpay",
            "subscription_id": sub["id"],
            "key_id": RAZORPAY_KEY_ID,
            "amount": PRICES[plan]["inr"],
            "currency": "INR",
            "plan": plan,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")


# ─────────────────────────────────────────────────
# POST /portal — Stripe customer portal
# ─────────────────────────────────────────────────

@router.post("/portal")
async def create_portal(body: PortalRequest):
    stripe = _stripe()
    if not stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    user = get_user_by_id(body.user_id)
    if not user or not user.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No Stripe customer found for this user")

    return_url = body.return_url or f"{FRONTEND_URL}/dashboard"
    try:
        session = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=return_url,
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe portal error: {str(e)}")


# ─────────────────────────────────────────────────
# POST /razorpay/verify — verify payment after checkout
# ─────────────────────────────────────────────────

@router.post("/razorpay/verify")
async def verify_razorpay(body: RazorpayVerifyRequest):
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    # HMAC-SHA256 verification
    payload = f"{body.razorpay_payment_id}|{body.razorpay_subscription_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    update_user_plan(body.user_id, body.plan, razorpay_sub_id=body.razorpay_subscription_id)
    return {"status": "success", "plan": body.plan}


# ─────────────────────────────────────────────────
# POST /stripe/webhook — Stripe events
# ─────────────────────────────────────────────────

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    stripe = _stripe()
    if not stripe:
        return {"status": "stripe_not_configured"}

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    evt_type = event["type"]
    data = event["data"]["object"]

    if evt_type == "checkout.session.completed":
        user_id = data.get("client_reference_id") or data.get("metadata", {}).get("user_id")
        plan = data.get("metadata", {}).get("plan", "starter")
        customer_id = data.get("customer")
        if user_id:
            update_user_plan(user_id, plan, stripe_customer_id=customer_id)

    elif evt_type == "customer.subscription.updated":
        # Plan change within Stripe
        customer_id = data.get("customer")
        status = data.get("status")
        # Map Stripe status to our plan: active → keep plan, cancelled → downgrade to free
        if status not in ("active", "trialing"):
            _downgrade_by_stripe_customer(customer_id, stripe)

    elif evt_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        customer_id = data.get("customer")
        _downgrade_by_stripe_customer(customer_id, stripe)

    return {"status": "ok", "type": evt_type}


def _downgrade_by_stripe_customer(customer_id: str, stripe):
    if not customer_id:
        return
    try:
        customer = stripe.Customer.retrieve(customer_id)
        user_id = (customer.get("metadata") or {}).get("user_id")
        if user_id:
            update_user_plan(user_id, "free")
    except Exception:
        pass


# ─────────────────────────────────────────────────
# POST /razorpay/webhook — Razorpay events
# ─────────────────────────────────────────────────

@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    if not RAZORPAY_KEY_SECRET:
        return {"status": "razorpay_not_configured"}

    payload = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")

    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload,
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    evt = event.get("event", "")
    entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
    notes = entity.get("notes", {})
    user_id = notes.get("user_id")
    plan = notes.get("plan", "starter")

    if evt == "subscription.activated" and user_id:
        update_user_plan(user_id, plan, razorpay_sub_id=entity.get("id"))

    elif evt in ("subscription.cancelled", "subscription.expired", "payment.failed") and user_id:
        update_user_plan(user_id, "free")

    return {"status": "ok", "event": evt}
