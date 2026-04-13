/**
 * Credential sign-up payload (API / server boundary).
 * Validation lives in route handlers or auth flows; this type documents the contract.
 */
export type CreateUserDto = {
  email: string;
  password: string;
};
