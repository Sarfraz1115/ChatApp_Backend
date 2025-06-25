import cloudinary from "../lib/cloudinary.js";
import { getRecieverSocketId } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io } from "../lib/socket.js";
import axios from "axios";
import dotenv from 'dotenv';
import CryptoJS from "crypto-js";

dotenv.config();
const SECRET_KEY = "my_secret_key_123"; // This should be stored securely, not hardcoded

export const getSuggestions = async (req, res) => {
    try {

        const { recentMessages } = req.body;
        const lastmessages = recentMessages.slice(-5); // Get the last 5 messages
        const chatHistory = lastmessages.map((msg) => {
            let decryptText = "";
            try {
                decryptText = CryptoJS.AES.decrypt(msg.text, SECRET_KEY).toString(CryptoJS.enc.Utf8);
                if (!decryptText) decryptText = msg.text; // Fallback to original text if decryption fails
            } catch (error) {
                decryptText = msg.text; // Fallback to original text if decryption fails
            }
            // You can improve this line if you want to show "me"/"other" based on sender
            return `${msg.senderId.toString() === req.user._id.toString() ? "me" : "other"}: ${decryptText}`;
        }).join("\n");

        const prompt = `You're assisting in a casual chat between two friends. One is labeled 'me', the other is 'other'.
    Continue the conversation naturally with 3 short and friendly replies from 'me'.
    Each reply should be a single line, short sentences (no more than 10 words).
    Do not explain, do not add any labels, and do not use the word "Bot".
    Just reply as 'me' would in chat, in a casual, friendly way.
    Each reply should be on a new line and numbered 1., 2., and 3.

    Example:
    me: How are you?
    other: I'm good! You?
    Replies:
    1. I'm great!
    2. Ready for the gym?
    3. Let's crush it!

${chatHistory}

Replies:
1.`;

        console.log("cohore prompt: ", prompt);

        const response = await axios.post(
            "https://api.cohere.ai/v1/generate",
            {
                model: "command",
                prompt,
                max_tokens: 100,
                temperature: 0.4,
                k: 0,
                stop_sequences: ["\n\n"]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const suggestionsText = response.data.generations[0].text;
        console.log("Cohere Suggestions: ", suggestionsText);

        const suggestions = suggestionsText
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.replace(/^\d+\.\s*/, ''));

        res.json(suggestions);
    } catch (error) {
        if (error.code === "insufficient_quota" || error.status === 429) {
            res.status(429).json({ message: "Enable OpenAI billing to get suggestions." });
        } else {
            console.error("AI Suggestion Error:", error);
            res.status(500).json({ message: "Failed to get suggestions" });
        }
    }
}


export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedUserId } }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getUsereForSidebar: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });

    }
}


export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params
        const myId = req.user._id;

        const messages = await Message.find({
            // this shows ki if sender is me so reciever is other user
            // if sender is other use so reciever is me.
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        })
        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });

    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }
        const newMessage = await Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        // todo: realtime functionality goes here => Socket.io
        const recieverSocketId = getRecieverSocketId(receiverId);
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage)
    } catch (error) {
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });


    }
}