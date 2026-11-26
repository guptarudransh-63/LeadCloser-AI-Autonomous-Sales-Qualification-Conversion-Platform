const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { ROLES } = require('../config/constants');
const { logAudit } = require('../services/auditService');

const generateToken = (userId, res) => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'super-secure-leadcloser-jwt-secret-key-2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, businessName, businessType } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required registration fields (name, email, password, businessName).'
      });
    }

    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let workspace = await Workspace.findOne({ slug });
    if (!workspace) {
      workspace = await Workspace.create({
        name: businessName,
        slug: slug || `ws-${Date.now()}`,
        businessType: businessType || 'IT & Digital Services'
      });
    }

    const existingUser = await User.findOne({ workspaceId: workspace._id, email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists in this workspace.'
      });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      workspaceId: workspace._id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: ROLES.OWNER
    });

    const token = generateToken(user._id, res);

    await logAudit({
      workspaceId: workspace._id,
      userId: user._id,
      action: 'user.registered',
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      workspace: {
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        currency: workspace.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('workspaceId');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated. Contact administrator.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, res);

    await logAudit({
      workspaceId: user.workspaceId._id,
      userId: user._id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      workspace: {
        id: user.workspaceId._id,
        name: user.workspaceId.name,
        slug: user.workspaceId.slug,
        currency: user.workspaceId.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
};

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone
    },
    workspace: {
      id: req.workspace._id,
      name: req.workspace.name,
      slug: req.workspace.slug,
      businessType: req.workspace.businessType,
      currency: req.workspace.currency,
      timezone: req.workspace.timezone,
      settings: req.workspace.settings
    }
  });
};
