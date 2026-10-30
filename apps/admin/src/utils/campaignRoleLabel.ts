export function campaignRoleLabel(role: { name?: string; code?: string } | null | undefined, other?: string | null) {
  if ((role?.code?.endsWith('_others') || role?.name === 'Others') && other) return ['Others', other].join(': ');
  if ((role?.code === 'crew_others' || role?.name === 'Others') && other) return `Others: ${other}`;
  return role?.name || other || 'Not assigned';
}
