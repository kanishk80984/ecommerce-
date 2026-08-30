export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  import('fs').then(fs => fs.appendFileSync('error.log', new Date().toISOString() + ' ' + err.stack + '\n'));
  
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'MulterError') {
    statusCode = 400;
  } else if (err.message === 'Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.') {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
};
