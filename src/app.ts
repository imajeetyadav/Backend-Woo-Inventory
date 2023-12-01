import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import createError from "http-errors";

import authRouter from "./business/authentication/index.js";
import webhookRouter from "../src/webhook/index.js";

import type {
  Express,
  NextFunction,
  Request,
  Response,
} from "express";

dotenv.config();

const app: Express = express();

const PORT = process.env["SERVICE_PORT"] || 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/webhook", webhookRouter);
app.use("/api/v1", authRouter);

app.use(function (_req: Request, _res: Response, next: NextFunction) {
  next(createError(404));
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
