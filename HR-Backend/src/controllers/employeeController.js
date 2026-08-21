// Employee controller for CRUD operations
const Employee = require('../models/employee');

// Get employee by ID
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new employee
exports.createEmployee = async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; const PersonalDetails = require('../models/personalDetails');

exports.submitPersonalDetails = async (req, res) => {
  try {
    const { userId, ...details } = req.body;
    let personalDetails = await PersonalDetails.findOne({ userId });

    if (personalDetails) {
      personalDetails = await PersonalDetails.findOneAndUpdate({ userId }, details, { new: true });
    } else {
      personalDetails = new PersonalDetails({ userId, ...details });
      await personalDetails.save();
    }

    res.status(201).json({ message: 'Personal details submitted successfully', personalDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting personal details', error });
  }
};
