import express, { application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

//import routes
import userRouter from "./routes/user.routes.js";
import commentRouter from "./routes/comment.routes.js"
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"
import healthCheckRouter from "./routes/healthcheck.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/healthcheck", healthCheckRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/subscription", subscriptionRouter )
export { app };
