const Notification = require('../models/Notification');

let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const sendNotification = async ({ workspaceId, userId = null, title, message, type = 'system', link = null }) => {
  try {
    const notification = await Notification.create({
      workspaceId,
      userId,
      title,
      message,
      type,
      link,
      isRead: false
    });

    if (ioInstance) {
      if (userId) {
        ioInstance.to(`user:${userId}`).emit('notification', notification);
      } else {
        ioInstance.to(`workspace:${workspaceId}`).emit('notification', notification);
      }
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error sending notification:', error.message);
    return null;
  }
};

module.exports = { setSocketIO, sendNotification };
