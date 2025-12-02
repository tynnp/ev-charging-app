# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Nguyễn Ngọc Phú Tỷ
# This file is part of ev-charging-app and is licensed under the
# MIT License. See the LICENSE file in the project root for details.

from __future__ import annotations
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes", "on"}
SMTP_TIMEOUT = float(os.getenv("SMTP_TIMEOUT", "10"))

def send_otp_email(username: str, recipient_email: str, otp: str) -> bool:
    """Send OTP email via SMTP. Returns True on success."""
    if not SMTP_HOST or not SMTP_PORT or not EMAIL_FROM:
        logger.error(
            "Missing SMTP configuration. Ensure SMTP_HOST, SMTP_PORT, and EMAIL_FROM are set."
        )
        return False

    try:
        port = int(SMTP_PORT)
    except ValueError:
        logger.error("Invalid SMTP_PORT value: %s", SMTP_PORT)
        return False

    message = EmailMessage()
    message["Subject"] = "Mã xác thực OTP đăng ký tài khoản"
    message["From"] = EMAIL_FROM
    message["To"] = recipient_email
    message.set_content(
        (
            "Xin chào {username},\n\n"
            "Mã OTP của bạn là: {otp}.\n"
            "Mã sẽ hết hạn sau 5 phút. Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.\n\n"
            "Trân trọng,\nĐội ngũ EV Charging"
        ).format(username=username or "bạn", otp=otp)
    )

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, port, timeout=SMTP_TIMEOUT) as server:
            if SMTP_USE_TLS:
                server.starttls(context=context)
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as exc:  # pragma: no cover - network interaction
        logger.error("Failed to send OTP email to %s: %s", recipient_email, exc)
        return False