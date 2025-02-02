import dotenv from "dotenv";
import { StatusCodes } from "http-status-codes";

import { createErrorResponse } from "../../modules/create-error-response.js";
import logger from "../../modules/create-logger.js";
import { createVerifyBasicAuthHeaderToken } from "../../modules/create-verify-authorization-header.js";
import { getUserByAttribute } from "../../repository/firestore/index.js";

import type {
  Request,
  Response,
} from "express";
dotenv.config();

const SERVICE_ERRORS = {
  notAuthorized: {
    statusCode: StatusCodes.UNAUTHORIZED,
    type: "/products/synced/not-authorized",
    message: "not authorized",
  },
  resourceNotFound: {
    statusCode: StatusCodes.NOT_FOUND,
    type: "/products/synced/not-found",
    message: "resource not found",
  },
};

export const areProductsSynced = async (req: Request, res: Response) => {
  const userId = createVerifyBasicAuthHeaderToken(req.headers["authorization"]);
  if (!userId) {
    logger.log("error", `no decoded token from ${JSON.stringify(req.headers["authorization"])} authorization header`);
    return createErrorResponse(res, SERVICE_ERRORS.notAuthorized);
  }

  const userFoundInFirestore = await getUserByAttribute("user_id", userId);
  if (!userFoundInFirestore) {
    logger.log("error", `user not found by id ${userId}`);
    return createErrorResponse(res, SERVICE_ERRORS.resourceNotFound);
  }

  return res.status(200).send({ are_products_synced: userFoundInFirestore.are_products_synced });
};
