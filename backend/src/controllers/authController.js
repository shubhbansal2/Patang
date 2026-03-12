import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

export const registerUser =async(req, res) =>{
    try{
        const { email, password } =req.body;

        if(!email.endsWith('@iitk.ac.in')){
            return res.status(400).json({ message: "Invalid domain" });
        }

        const userExists= await User.findOne({ email });

        if(userExists){
            return res.status(400).json({ message: "User exists" });
        }

        const generatedOtp= Math.floor(100000 +Math.random() * 900000).toString();

        const user= await User.create({
            email,
            password,
            otp: generatedOtp
        });

        if(user){
            const message= `Your OTP for P.A.T.A.N.G registration is ${generatedOtp}.`;
            
            try{
                await sendEmail({
                    email: user.email,
                    subject: 'P.A.T.A.N.G - Verify Your Account',
                    message: message
                });

                res.status(201).json({
                    _id: user._id,
                    email: user.email,
                    message: "OTP sent successfully"
                });
            }catch(emailError){
                user.otp= undefined;
                await user.save();
                return res.status(500).json({ message: "Email could not be sent" });
            }
        }else{
            res.status(400).json({ message: "Invalid data" });
        }
    }catch(error){
        res.status(500).json({ message: error.message });
    }
};

export const verifyOtp= async(req, res) =>{
    try{
        const { email, otp } =req.body;
        const user =await User.findOne({ email });

        if(user && user.otp ===otp){
            user.isVerified= true;
            user.otp =undefined;
            await user.save();

            res.status(200).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role)
            });
        }else{
            res.status(401).json({ message: "Invalid OTP" });
        }
    }catch(error){
        res.status(500).json({ message: error.message });
    }
};

export const loginUser= async(req, res) =>{
    try{
        const { email, password } =req.body;
        const user =await User.findOne({ email });

        if(user && (await user.matchPassword(password))){
            if(!user.isVerified){
                return res.status(401).json({ message: "Not verified" });
            }
            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role)
            });
        }else{
            res.status(401).json({ message: "Invalid credentials" });
        }
    }catch(error){
        res.status(500).json({ message: error.message });
    }
};