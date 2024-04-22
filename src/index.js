import connectDB from "./db/db.js";
import 'dotenv/config'
const PORT = process.env.PORT || 5000;

connectDB().then(()=>{
    app.listen(()=>{
        console.log(`Server is running on port ${PORT}`);
    })
}).catch((e)=>{
    console.log("MongoDB connection error", e);
});