import jwt from "jsonwebtoken";

export const generateToken = (userID, res) => {
    const token = jwt.sign({userID}, process.env.JWT_SECRET, {
        expiresIn: "7d"
    })

    res.cookie("token", token, {
        httpOnly: true,  // prevent XSS attacks cross-site scripting attacks
        // secure: process.env.NODE_ENV !== "development",
        secure: true,  // Use secure cookies in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "none"  // CSRF attacks cross-site request forgery attacks
    })
    return token;
}