import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protectRoute = async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: "Token verification failed" });
        }
    } else {
        res.status(401).json({ message: "No authorization token provided" });
    }
};

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles?.length ? req.user.roles : ['student'];
        const hasRole = userRoles.some(role => allowedRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ message: "Access forbidden: insufficient permissions" });
        }
        next();
    };
};