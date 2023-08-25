import { Router } from 'express';
import {
  getChatMsgById,
  getChatRoomMsgsById,
  createOneOnOneChatRequest,
  getOneOnOneChatRequest,
  joinOneOnOneChat,
  createNewChatMessage,
  deleteChatHistory,
  deleteOneOnOneChatRequest,
  getChatInfoById,
  closeChatSession,
  startDirectChat,
  addCurrentChatToSupport,
  unsentChatMessage,
  likeChatMessage,
  getOneOnOneChatRequestDetail,
  unlikeChatMessage,
  cleanChatConversation,
} from '../controllers/chats';

const chatRouter = Router();

chatRouter.post('/delete', deleteChatHistory);
chatRouter.post('/clean', cleanChatConversation);
chatRouter.get('/info/:id', getChatInfoById);
chatRouter.get('/msg/:id', getChatMsgById);
chatRouter.get('/history/:id', getChatRoomMsgsById);
chatRouter.post('/request', createOneOnOneChatRequest);
chatRouter.delete('/request/:chatId', deleteOneOnOneChatRequest);
chatRouter.get('/requests', getOneOnOneChatRequest);
chatRouter.get('/request/:id', getOneOnOneChatRequestDetail);
chatRouter.post('/join', joinOneOnOneChat);
chatRouter.post('/msg', createNewChatMessage);
chatRouter.post('/unsent', unsentChatMessage);
chatRouter.post('/like', likeChatMessage);
chatRouter.post('/unlike', unlikeChatMessage);
chatRouter.post('/close', closeChatSession);
chatRouter.post('/direct', startDirectChat);
chatRouter.post('/add-support', addCurrentChatToSupport);

export default chatRouter;
