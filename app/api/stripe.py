"""
DEPRECATED — superseded by app/api/payments.py

This file is kept only for backward compatibility (the /api/stripe/... route is
still mounted in main.py). New payment logic lives entirely in payments.py.
Do not add features here.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/create-checkout-session")
async def create_checkout_session_legacy():
    return {
        "deprecated": True,
        "message": "Use POST /api/payments/checkout instead. This endpoint is a legacy stub.",
        "url": None,
    }


@router.post("/webhook")
async def stripe_webhook_legacy():
    return {
        "deprecated": True,
        "message": "Use POST /api/payments/stripe/webhook instead.",
        "status": "ignored",
    }
