const Settings = require('../models/Settings');
const path = require('path');

exports.get = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const { storeName, phone, address, whatsappNumber, theme } = req.body;
    let email = req.body.email;
    if (typeof email === 'string') {
      try { email = JSON.parse(email); } catch { email = undefined; }
    }

    if (storeName) settings.storeName = storeName;
    if (phone) settings.phone = phone;
    if (address) settings.address = address;
    if (whatsappNumber) settings.whatsappNumber = whatsappNumber;
    if (theme) settings.theme = { ...settings.theme, ...theme };
    if (email && typeof email === 'object') {
      settings.email = {
        host: email.host || settings.email?.host || '',
        port: Number(email.port) || settings.email?.port || 587,
        secure: email.secure === true || email.secure === 'true',
        user: email.user || settings.email?.user || '',
        pass: email.pass || settings.email?.pass || '',
        from: email.from || settings.email?.from || '',
        alertEmail: email.alertEmail || settings.email?.alertEmail || ''
      };
    }

    // Si se subió un logo
    if (req.file) {
      settings.logoUrl = `/uploads/${req.file.filename}`;
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
