import express from "express";

import { areProductsSynced } from "./are-products-synced.js";
import { getProducts } from "./get-products.js";
import { syncProducts } from "./sync-products.js";
import { handleErrorFunction } from "../../modules/create-error-function.js";

const productRouter = express.Router();

productRouter.get("/products", handleErrorFunction(getProducts));

productRouter.get("/products/synced", handleErrorFunction(areProductsSynced));

productRouter.post("/products/sync", handleErrorFunction(syncProducts));

export default productRouter;