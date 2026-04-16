// Feature: credential sign-up DTO (API/server boundary; validation lives in routes/auth flows).
export type CreateUserDto = {
  email: string;
  password: string;
};
