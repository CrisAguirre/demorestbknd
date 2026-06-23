const Staff = require('../models/Staff');

exports.getAll = async (req, res, next) => {
  try {
    const staff = await Staff.find({ isActive: true }).sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const staffMember = await Staff.create(req.body);
    res.status(201).json(staffMember);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const staffMember = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!staffMember) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(staffMember);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const staffMember = await Staff.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!staffMember) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json({ message: 'Empleado desactivado' });
  } catch (error) {
    next(error);
  }
};
