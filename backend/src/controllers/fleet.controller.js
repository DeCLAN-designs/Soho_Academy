const {
  createNumberPlate,
  deleteNumberPlate,
  getVehicleDetails,
  listNumberPlates,
  listUsersByRole,
  updateNumberPlateStatus,
  updateVehicleDetails,
} = require("../services/fleet.service.js");

const handleFleetError = (res, error, defaultMessage) => {
  if (error && error.code === "PLATE_NUMBER_REQUIRED") {
    return res.status(400).json({ message: "plate_number is required." });
  }

  if (error && error.code === "PLATE_NUMBER_EXISTS") {
    return res.status(409).json({ message: "Plate number already exists." });
  }

  if (error && error.code === "NUMBER_PLATE_NOT_FOUND") {
    return res.status(404).json({ message: "Number plate not found." });
  }

  if (error && error.code === "INVALID_PLATE_STATUS") {
    return res.status(400).json({ message: "Status must be active or inactive." });
  }

  if (error && error.code === "INVALID_USER_ROLE") {
    return res.status(400).json({ message: "Invalid user role." });
  }

  console.error(defaultMessage, error);

  return res.status(500).json({ message: defaultMessage });
};

const getNumberPlates = async (_req, res) => {
  try {
    const numberPlates = await listNumberPlates();

    return res.status(200).json(numberPlates);
  } catch (error) {
    return handleFleetError(res, error, "Failed to fetch number plates.");
  }
};

const getActiveNumberPlates = async (_req, res) => {
  try {
    const numberPlates = await listNumberPlates({ activeOnly: true });

    return res.status(200).json(numberPlates);
  } catch (error) {
    return handleFleetError(res, error, "Failed to fetch active number plates.");
  }
};

const postNumberPlate = async (req, res) => {
  try {
    const numberPlate = await createNumberPlate({
      plateNumber: req.body?.plate_number,
    });

    return res.status(201).json(numberPlate);
  } catch (error) {
    return handleFleetError(res, error, "Failed to create number plate.");
  }
};

const patchNumberPlateStatus = async (req, res) => {
  try {
    const numberPlate = await updateNumberPlateStatus({
      id: Number(req.params.id),
      status: req.body?.status,
    });

    return res.status(200).json(numberPlate);
  } catch (error) {
    return handleFleetError(res, error, "Failed to update number plate.");
  }
};

const removeNumberPlate = async (req, res) => {
  try {
    await deleteNumberPlate({ id: Number(req.params.id) });

    return res.status(204).send();
  } catch (error) {
    return handleFleetError(res, error, "Failed to delete number plate.");
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const users = await listUsersByRole({ role: req.params.role });

    return res.status(200).json(users);
  } catch (error) {
    return handleFleetError(res, error, "Failed to fetch users.");
  }
};

const getVehicleDetailsByPlate = async (req, res) => {
  try {
    const vehicleDetails = await getVehicleDetails({
      plateNumber: req.params.plateNumber,
    });

    if (!vehicleDetails) {
      return res.status(404).json({ message: "Vehicle details not found." });
    }

    return res.status(200).json(vehicleDetails);
  } catch (error) {
    return handleFleetError(res, error, "Failed to fetch vehicle details.");
  }
};

const putVehicleDetailsByPlate = async (req, res) => {
  try {
    const vehicleDetails = await updateVehicleDetails({
      plateNumber: req.params.plateNumber,
      payload: req.body || {},
    });

    return res.status(200).json(vehicleDetails);
  } catch (error) {
    return handleFleetError(res, error, "Failed to update vehicle details.");
  }
};

module.exports = {
  getActiveNumberPlates,
  getNumberPlates,
  getUsersByRole,
  getVehicleDetailsByPlate,
  patchNumberPlateStatus,
  postNumberPlate,
  putVehicleDetailsByPlate,
  removeNumberPlate,
};
