import { convertWooProductsToClient } from "./converter/convert-woo-product-to-client.js";
import { ProductsSchema } from "./models/products.type.js";
import createAxiosClient from "../../modules/create-axios-client.js";
import logger from "../../modules/create-logger.js";
import { isResponseTypeTrue } from "../../modules/create-response-type-guard.js";

import type {
  ProductType,
  ProductsFromWooType,
} from "./models/products.type.js";
import type {
  AxiosError,
  AxiosResponse,
} from "axios";

type getAllProductsPaginationResponse = {
  products: ProductType[];
  totalItems: number;
  totalPages: number;
};

export const getProductsPagination = async (baseUrl: string, token: string, perPage: number, page: number): Promise<getAllProductsPaginationResponse> => {
  const { get } = createAxiosClient<ProductsFromWooType>({
    config: {
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    },
    interceptors: [
      {
        onTrue: (response: AxiosResponse) => {
          if (response.status !== 200) {
            logger.log("error", `onTrue Intercepted: request ${response.config.url} with status code ${response.status} is not expected`);
            throw new Error("Response not expected");
          }
          if (!isResponseTypeTrue(ProductsSchema, response.data, true)) {
            logger.log("error", `onTrue Intercepted: request ${response.config.url} with ${response.data} does not return expected system status type`);
            throw new Error("Response not expected");
          }
          return response;
        },
        onError: (error: AxiosError) => {
          if (error.config) {
            logger.log("error", `onError Intercepted: request ${error.config.url}:`, error);
          }
          return error;
        },
      },
    ],
  });
  const {
    data,
    headers,
  } = await get(`/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`, { headers: { Authorization: token } });

  return {
    products: convertWooProductsToClient(data),
    totalItems: parseInt(headers["x-wp-total"] as string, 10),
    totalPages: parseInt(headers["x-wp-totalpages"] as string, 10),
  };
};