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

    if (storeName) settings.storeName = storeName;
    if (phone) settings.phone = phone;
    if (address) settings.address = address;
    if (whatsappNumber) settings.whatsappNumber = whatsappNumber;
    if (theme) settings.theme = { ...settings.theme, ...theme };

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
