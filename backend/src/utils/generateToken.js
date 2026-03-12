import jwt from 'jsonwebtoken';

const generateToken =((userId, userRole) =>{
    const payload= {
        id: userId,
        role: userRole
    };

    const secretKey= process.env.JWT_SECRET;

    const options ={
        expiresIn: '30d'
    };

    return jwt.sign(payload, secretKey, options);
});

export default generateToken;