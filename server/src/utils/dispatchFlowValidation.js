export const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;
  
  const validStatuses = [
    'PACKAGE_COLLECTED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_DELIVERY',
    'RETURN_TO_SELLER' // Note: This might map to 'RETURNED_FAILED_DELIVERY' or 'CANCELLED' in our DB, we'll map it in controller
  ];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid or missing status. Valid statuses are: ${validStatuses.join(', ')}`
    });
  }

  next();
};

export const validateTrackingUpdate = (req, res, next) => {
  const { status, location } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: status'
    });
  }

  next();
};
