import { auth } from "@/server/auth";
// @ts-expect-error
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
