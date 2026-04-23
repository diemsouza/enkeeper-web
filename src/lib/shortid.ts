import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890abcdef", 10);
export const generateShortId = (size = 8) => nanoid(size);
