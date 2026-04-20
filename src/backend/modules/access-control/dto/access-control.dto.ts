/**
 * access control dto
 * handle access control dto logic
 */
export type AdminPermissionRequirementDto = {
  permission: string;
};

export type AdminAnyPermissionRequirementDto = {
  permissions: string[];
};
