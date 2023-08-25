import { Router } from 'express';
import {
  changePassword,
  deleteUser,
  fetchUsers,
  fetchUser,
  updateUser,
  resetPassword,
  resetPasswordEmail,
  dismissNotification,
  clearNotifications,
  fetchPublicUser,
  setUserPushNotificationToken,
  fetchUserLatestChatRequest,
  fetchUserChatContactHistory,
  fetchUserAllRequestsAndNotifications,
  editBlockedUsers,
  checkIfIsThirdParty,
  updateListenerProfile,
  createListenerReview,
  removeSupport,
  getUserNotificationSettings,
  updateUserNotificationSettings,
  checkUserBadge,
} from '../controllers/users';
import { requireAdmin, requireAuth } from '../middleware/guards';

const usersRouter = Router();

usersRouter.delete('/', requireAuth('query'), deleteUser);
usersRouter.put('/password/:id', changePassword);
usersRouter.put('/update/:id', requireAuth(), updateUser);
usersRouter.get('/', requireAdmin, fetchUsers);
usersRouter.get('/public/:id', fetchPublicUser); // Only public fields
usersRouter.get('/third-party/:id', checkIfIsThirdParty);
usersRouter.post('/password/reset', resetPassword);
usersRouter.post('/password/resetEmail', resetPasswordEmail);
usersRouter.put('/listener/:id', requireAuth(), updateListenerProfile);
usersRouter.delete(
  '/notifications/clear/:id',
  requireAuth(),
  clearNotifications
);
usersRouter.get('/notifications/settings', getUserNotificationSettings);
usersRouter.post('/notifications/settings', updateUserNotificationSettings);
usersRouter.delete('/notifications/:id', requireAuth(), dismissNotification);
usersRouter.post('/notification/token', setUserPushNotificationToken);
usersRouter.get('/notification/:userId', fetchUserAllRequestsAndNotifications);
usersRouter.get('/chat-request/latest', fetchUserLatestChatRequest);
usersRouter.get('/chats', fetchUserChatContactHistory);
usersRouter.get('/:id', requireAuth(), fetchUser);
usersRouter.put('/block/:userId', editBlockedUsers);
usersRouter.post('/review/:id/:listenerId', createListenerReview);
usersRouter.post('/remove-support/:id', removeSupport);
usersRouter.get('/badge/:id', checkUserBadge);

export default usersRouter;
