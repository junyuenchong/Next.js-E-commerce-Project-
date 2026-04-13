/** Authenticated password change (profile API). */
export type UpdateUserPasswordDto = {
  currentPassword: string;
  newPassword: string;
};
