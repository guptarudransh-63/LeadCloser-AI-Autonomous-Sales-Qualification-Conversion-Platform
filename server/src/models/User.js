const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const UserSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.SALES_AGENT
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Unique email per workspace
UserSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.model('User', UserSchema);
