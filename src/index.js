import express from "express";
import authroutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
// import path from "path";
import { app, server } from "./lib/socket.js";



dotenv.config();

const PORT = process.env.PORT || 4000;


app.use(express.json({limit: '10mb'}));  // this is allow to us extract json data out of file
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}))

app.use("/api/auth", authroutes);
app.use("/api/messages", messageRoutes);



server.listen(PORT, () =>{
    console.log("Server started on port port : " + PORT);
    connectDB();
});
