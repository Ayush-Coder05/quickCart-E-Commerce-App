require("dotenv").config();
const nodemailer = require("nodemailer");

async function testSmtp() {
  console.log("Testing SMTP connection to Gmail...");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "quicckcart@gmail.com",
      pass: "uecq csfl uuxj eyan".replace(/\s+/g, ""),
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection SUCCESSFUL! Credentials are correct.");
  } catch (err) {
    console.error("❌ SMTP connection FAILED!");
    console.error(err);
  }
}

testSmtp();
