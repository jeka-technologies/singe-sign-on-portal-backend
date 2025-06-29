import dotenv from "dotenv";
import express from "express";
import { handleInvalidJson } from "./middlewares";
import { UserRoutes } from "./routes";

dotenv.config();

const app = express();
app.use(express.json());

// Error handling middleware should be added after all routes
app.use(handleInvalidJson);

// Routes
const userRoutes = new UserRoutes()
app.use("/api/users", userRoutes.router)



export default app;
