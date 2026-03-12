import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protectRoute= async(req, res, next) =>{
    let token;

    const authorizationHeader =req.headers.authorization;

    if(authorizationHeader && authorizationHeader.startsWith('Bearer')){
        try{
            token= authorizationHeader.split(' ')[1];

            const decodedToken =jwt.verify(token, process.env.JWT_SECRET);

            req.user= await User.findById(decodedToken.id).select('-password');

            next();
        }catch(error){
            res.status(401).json({ message: "Token failed" });
        }
    }else{
        res.status(401).json({ message: "No token provided" });
    }
};

export const authorizeRoles= (...roles) =>{
    return (req, res, next) =>{
        if(!roles.includes(req.user.role)){
            return res.status(403).json({
                message: "Forbidden"
            });
        }
        next();
    };
};