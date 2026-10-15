import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def send_otp_email(to_email: str, otp: str):
    """Send verification OTP email using Gmail SMTP with dev console fallback."""
    print(f"\n==========================================")
    print(f"📧 [QUICKCART OTP] Code for {to_email}: {otp}")
    print(f"==========================================\n")

    if not SMTP_USER or not SMTP_PASS:
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} is your QuickCart verification code"
        msg["From"] = f"QuickCart <{SMTP_USER}>"
        msg["To"] = to_email

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background: #FFFFFF;">
          <h2 style="color: #16A34A; margin-bottom: 8px;">Welcome to QuickCart! 🛒</h2>
          <p style="color: #374151; font-size: 15px;">Use the verification code below to verify your email address:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background: #F3F4F6; padding: 12px 28px; border-radius: 8px; border: 1px dashed #16A34A;">{otp}</span>
          </div>
          <p style="color: #6B7280; font-size: 13px;">This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        
        return True
    except Exception as e:
        print(f"⚠️ SMTP error (OTP printed above for dev): {e}")
        return True
