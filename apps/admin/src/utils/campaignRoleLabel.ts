export function campaignRoleLabel(role: { name?: string; code?: string } | null | undefined, other?: string | null) {
  const isOtherRole = role?.code?.endsWith('_others') || role?.name === 'Others' || role?.name === 'Other';
  if (isOtherRole && other) return `Other: ${other}`;
  if (isOtherRole) return 'Other';
  return role?.name || other || 'Not assigned';
}
