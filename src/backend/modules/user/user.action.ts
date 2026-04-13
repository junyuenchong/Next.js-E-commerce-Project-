"use server";

import {
  hashPasswordUserService,
  registerUserUserService,
  verifyPasswordUserService,
} from "./user.service";
export type { AuthResult } from "./types/user.type";

export const hashPasswordUserAction = hashPasswordUserService;
export const verifyPasswordUserAction = verifyPasswordUserService;
export const registerUserUserAction = registerUserUserService;

export const hashPassword = hashPasswordUserAction;
export const verifyPassword = verifyPasswordUserAction;
export const registerUser = registerUserUserAction;
