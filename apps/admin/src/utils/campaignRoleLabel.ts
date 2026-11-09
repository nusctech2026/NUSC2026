export function campaignRoleLabel(role: { name?: string; code?: string } | null | undefined, other?: string | null) {
  const isOtherRole = role?.code?.endsWith('_others') || role?.name === 'Others' || role?.name === 'Other';
  if (isOtherRole && other) return `Other: ${other}`;
  if (isOtherRole) return 'Other';
  return role?.name || other || 'Not assigned';
}

export function campaignPassRoleLabel(role: { name?: string; code?: string } | null | undefined, other?: string | null) {
  const specifiedRole = other?.trim();
  const roleName = role?.name?.trim().toLowerCase();
  const roleCode = role?.code?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || '';
  const isOtherRole = roleName === 'other' || roleName === 'others'
    || /(?:^|_)(?:other|others)(?:_|$)/.test(roleCode);

  if (isOtherRole && specifiedRole) return specifiedRole;
  return campaignRoleLabel(role, other);
}
