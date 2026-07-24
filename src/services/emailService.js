const nodemailer = require('nodemailer');

let transporter = null;

async function initTransporter() {
  const Settings = require('../models/Settings');
  const settings = await Settings.getSettings();
  const cfg = settings.email || {};

  if (!cfg.host || !cfg.port || !cfg.user || !cfg.pass) {
    // Fallback to env vars
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    } else {
      console.warn('[emailService] SMTP not configured');
      transporter = null;
    }
  } else {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass }
    });
  }
}

async function sendAlertEmail(subject, html) {
  if (!transporter) await initTransporter();
  if (!transporter) return;

  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const to = settings.email?.alertEmail || process.env.ALERT_EMAIL;

    if (!to) {
      console.warn('[emailService] No alert email configured');
      return;
    }

    const from = settings.email?.from || `"${settings.storeName}" <${settings.email?.user || 'noreply@example.com'}>`;

    await transporter.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message);
  }
}

function buildStockAlertHtml(alerts) {
  const rows = alerts.map(a => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.product?.name || 'N/A'}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.product?.stock ?? '?'}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.product?.minStock ?? '?'}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd"><strong>${a.type === 'sin_stock' ? 'AGOTADO' : 'BAJO'}</strong></td>
    </tr>
  `).join('');

  return `
    <h2 style="color:#D4AF37">⚠️ Alertas de Stock</h2>
    <p>Se han detectado productos con stock bajo en <strong>${alerts[0]?.storeName || 'La Soupe à l\'Oignon'}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead><tr style="background:#151822;color:#D4AF37">
        <th style="padding:8px;text-align:left">Producto</th>
        <th style="padding:8px;text-align:left">Stock Actual</th>
        <th style="padding:8px;text-align:left">Stock Mínimo</th>
        <th style="padding:8px;text-align:left">Estado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;color:#888;font-size:12px">Este es un mensaje automático del sistema de gestión.</p>
  `;
}

module.exports = { initTransporter, sendAlertEmail, buildStockAlertHtml };
