/**
 * create user dto
 * handle create user dto logic
 */
// credential sign-up DTO (API/server boundary; validation lives in routes/auth flows).
export type CreateUserDto = {
  email: string;
  password: string;
};
