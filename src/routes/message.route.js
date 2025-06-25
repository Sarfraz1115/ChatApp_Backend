import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getUsersForSidebar, getMessages, sendMessage, getSuggestions } from '../controllers/message.controller.js';

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.post("/suggestions", protectRoute, getSuggestions);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

export default router;