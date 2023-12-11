import dotenv from "dotenv";
import * as EmailValidator from "email-validator";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { getExistingAppUserByEmail } from "../../repository/spanner/get-app-user.js";
import { insertAppUserToWooUser } from "../../repository/spanner/insert-app-user-to-woo-user.js";
import { insertAppUser } from "../../repository/spanner/insert-app-user.js";
import { insertWooUser } from "../../repository/spanner/insert-woo-user.js";
import { getSystemStatus } from "../../repository/woo-api/get-system-status.js";
import { validateTypeFactory } from "../../util/ajvValidator.js";
import { createBasicAuthHeaderToken } from "../../util/createBasicAuthHeader.js";
import { createErrorResponse } from "../../util/errorReponse.js";
import { hashPasswordAsync } from "../../util/hashPassword.js";

import type {
  Request,
  Response,
} from "express";
dotenv.config();

const createUrlRequestBodySchema = {
  type: "object",
  properties: {
    appURL: { type: "string" },
    email: { type: "string" },
    username: { type: "string" },
    password: { type: "string" },
    token: { type: "string" },
  },
  required: [
    "appURL",
    "email",
    "username",
    "password",
    "token",
  ],
  additionalProperties: false,
};

const SERVICE_ERRORS = {
  invalidRequest: {
    statusCode: StatusCodes.BAD_REQUEST,
    type: "/auth/signup-failed",
    title: "invalid request",
  },
  invalidTokenOrAppUrl: {
    statusCode: StatusCodes.UNAUTHORIZED,
    type: "/auth/signup-failed",
    title: "invalid token or app url",
  },
  invalidJwtToken: {
    statusCode: StatusCodes.UNAUTHORIZED,
    type: "/auth/signup-failed",
    title: "invalid jwt token",
  },
  databaseError: {
    statusCode: StatusCodes.BAD_REQUEST,
    type: "/auth/signup-failed",
    title: "database error",
  },
  invalidSecret: {
    statusCode: StatusCodes.UNAUTHORIZED,
    type: "/auth/signup-failed",
    title: "cannot generate response",
  },
  internalServerError: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    type: "/auth/signup-failed",
    title: "internal server error",
  },
  existingEmail: {
    statusCode: StatusCodes.BAD_REQUEST,
    type: "/auth/signup-failed",
    title: "Existing email",
  },
  invalidEmail: {
    statusCode: StatusCodes.BAD_REQUEST,
    type: "/auth/signup-failed",
    title: "invalid email",
  },
  invalidPassword: {
    statusCode: StatusCodes.BAD_REQUEST,
    type: "/auth/signup-failed",
    title: "invalid password",
  },
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const signup = async (req: Request, res: Response) => {

  if (!validateTypeFactory(req.body, createUrlRequestBodySchema))
    return createErrorResponse(res, SERVICE_ERRORS.invalidRequest);

  if (await getExistingAppUserByEmail(req.body.email) === false) return createErrorResponse(res, SERVICE_ERRORS.existingEmail);

  if (!EmailValidator.validate(req.body.email)) return createErrorResponse(res, SERVICE_ERRORS.invalidEmail);

  if (!passwordRegex.test(req.body.password)) return createErrorResponse(res, SERVICE_ERRORS.invalidPassword);

  const base_url =
    process.env["NODE_ENV"] === "production" ? req.body.appURL : process.env["WOO_BASE_URL"];
  const systemStatus = await getSystemStatus(
    `${base_url}`,
    createBasicAuthHeaderToken(
      req.body.token.split("|")[0],
      req.body.token.split("|")[1],
    ),
  );
  if (!systemStatus) return createErrorResponse(res, SERVICE_ERRORS.invalidTokenOrAppUrl);

  const appUserId = randomUUID();
  const wooUserId = randomUUID();

  const hashedPassword = await hashPasswordAsync(req.body.password, 10);
  if (!hashedPassword) return createErrorResponse(res, SERVICE_ERRORS.internalServerError);

  const insertAppUserResult = await insertAppUser({
    app_user_id: appUserId,
    app_email: req.body.email,
    app_username: req.body.username,
    app_password: hashedPassword,
    app_url: req.body.appURL,
    authenticated: true,
  });
  if (!insertAppUserResult)
    return createErrorResponse(res, SERVICE_ERRORS.databaseError);
  const insertWooUserResult = await insertWooUser({
    woo_user_id: wooUserId,
    woo_token: req.body.token.split("|")[0],
    woo_secret: req.body.token.split("|")[1],
  });
  if (!insertWooUserResult)
    return createErrorResponse(res, SERVICE_ERRORS.databaseError);
  const insertAppUserToWooUserResult = await insertAppUserToWooUser({
    app_user_id: appUserId,
    woo_user_id: wooUserId,
  });
  if (!insertAppUserToWooUserResult)
    return createErrorResponse(res, SERVICE_ERRORS.databaseError);

  if (!process.env["JWT_SECRET"]) return createErrorResponse(res, SERVICE_ERRORS.invalidJwtToken);
  const token = jwt.sign({ appUserId }, process.env["JWT_SECRET"]);

  return res.status(200).send({ jwtToken: token });
};

export default signup;