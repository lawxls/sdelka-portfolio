import { setupWorker } from "msw/browser";
import { companiesHandlers } from "./companies-handlers";

export const worker = setupWorker(...companiesHandlers);
