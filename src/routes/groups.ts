import { Router } from 'express';
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  fetchGroup,
  fetchMessages,
  removeMember,
  requestToAddMember,
  sendMessage,
  updateGroup,
  fetchGroupsByCategory,
  emailGroupMemberInvite,
  emailGroupCofacilitatorInvite,
  searchGroups,
  deleteMessage,
  fetchPublicGroups,
  fetchGroupsByUser,
  revokeCoFacilitator,
  fetchAddMemberList,
  fetchAddCoFacilitatorList,
} from '../controllers/groups';
import { requireAuth } from '../middleware/guards';

const groupsRouter = Router();

groupsRouter.post('/', requireAuth('body', 'creator'), createGroup);
groupsRouter.get('/', fetchGroups);
groupsRouter.get('/category/:category', fetchGroupsByCategory);
groupsRouter.get('/search', searchGroups);
groupsRouter.get('/messages/:id', fetchMessages);
groupsRouter.get('/member/:id', fetchGroupsByUser);
groupsRouter.delete('/member/:id', removeMember);
groupsRouter.post('/member/:id', requestToAddMember);
groupsRouter.post('/messages/:id', sendMessage);
groupsRouter.post('/messages/:id/unsent/', deleteMessage);
groupsRouter.post('/invite/:id/members/email', emailGroupMemberInvite);
groupsRouter.post(
  '/invite/:id/cofacilitators/email',
  emailGroupCofacilitatorInvite
);
groupsRouter.delete('/:id', deleteGroup);
groupsRouter.put('/:id', updateGroup);
groupsRouter.get('/:id', fetchGroup);
groupsRouter.get('/search/public', fetchPublicGroups);
groupsRouter.post('/revoke/CoFacilitator', revokeCoFacilitator);
groupsRouter.get('/list/member/:groupId/:userId', fetchAddMemberList);
groupsRouter.get('/list/cofacilitator/:groupId', fetchAddCoFacilitatorList);

export default groupsRouter;
