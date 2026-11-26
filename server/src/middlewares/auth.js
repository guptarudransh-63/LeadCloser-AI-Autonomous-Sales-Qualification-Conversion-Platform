const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secure-leadcloser-jwt-secret-key-2026');
    const user = await User.findById(decoded.userId).populate('workspaceId');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive account.'
      });
    }

    req.user = user;
    req.workspaceId = user.workspaceId._id ? user.workspaceId._id : user.workspaceId;
    req.workspace = user.workspaceId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.'
      });
    }
    next(error);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: role '${req.user.role}' lacks sufficient privileges. Required: [${roles.join(', ')}]`
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
