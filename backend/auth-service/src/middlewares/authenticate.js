"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jose_1 = require("jose");
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Authorization header missing or malformed" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const secretKey = Buffer.from(process.env.JWT_SECRET, 'base64');
        const decodedToken = yield (0, jose_1.jwtDecrypt)(token, secretKey);
        req.user = decodedToken.payload.user;
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
});
exports.default = authenticate;
