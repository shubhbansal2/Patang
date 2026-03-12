import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

dotenv.config();

const port =process.env.PORT || 5000;

const connectDB= async() =>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected");
    }catch(error){
        console.log(error);
        process.exit(1);
    }
};

connectDB().then(() =>{
    app.listen(port, () =>{
        console.log(`Server is running on port ${port}`);
    });
});