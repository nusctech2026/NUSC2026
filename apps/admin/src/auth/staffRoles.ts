export const staffRoles = [
  'super_admin', 'store_manager', 'content_editor', 'support', 'fulfillment_staff',
  'trials_manager', 'campaign_manager', 'reviewer', 'gate_staff',
];

const campaignRoles = new Set(['campaign_manager', 'reviewer', 'gate_staff']);

type StaffUser = { id?: string | number; roles?: string[]; display_roles?: { role: string }[] };
type AccessArgs = { req: { user?: StaffUser | null } };
type HiddenArgs = { user?: StaffUser | null };

export function hasCampaignRole(roles: readonly string[]): boolean {
  return roles.some(role => campaignRoles.has(role));
}

export function hasOnlyCampaignRoles(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every(role => campaignRoles.has(role));
}

export function isCampaignOnlyStaff(user: unknown): boolean {
  const value = user as { roles?: string[]; display_roles?: { role: string }[] } | null;
  const roles = value?.roles ?? value?.display_roles?.map(item => item.role) ?? [];
  return hasCampaignRole(roles)
    && !roles.some(role => staffRoles.includes(role) && !campaignRoles.has(role));
}

// Campaign-only users enter the Payload shell, but its unrelated collections and
// globals stay inaccessible, including through direct REST/GraphQL requests.
export function restrictCampaignCollection<T extends { slug: string; access?: object; admin?: object }>(collection: T): T {
  const collectionAccess = collection.access as Record<string, unknown> | undefined;
  const collectionAdmin = collection.admin as (Record<string, unknown> & { hidden?: unknown }) | undefined;
  const access: Record<string, unknown> = { ...collectionAccess };
  for (const operation of ['read', 'readVersions', 'create', 'update', 'delete', 'unlock']) {
    const previous = access[operation];
    access[operation] = (args: AccessArgs) => {
      if (isCampaignOnlyStaff(args.req.user)) {
        const userId = args.req.user?.id;
        return operation === 'read' && collection.slug === 'admins' && userId !== undefined
          ? { id: { equals: userId } } : false;
      }
      return typeof previous === 'function'
        ? (previous as (value: AccessArgs) => unknown)(args)
        : Boolean(args.req.user);
    };
  }
  const hidden = collectionAdmin?.hidden;
  return {
    ...collection,
    access,
    admin: {
      ...collectionAdmin,
      hidden: (args: HiddenArgs) => isCampaignOnlyStaff(args.user)
        || (typeof hidden === 'function' ? Boolean((hidden as (value: HiddenArgs) => unknown)(args)) : Boolean(hidden)),
    },
  } as T;
}

export function restrictCampaignGlobal<T extends { access?: object; admin?: object }>(global: T): T {
  const globalAccess = global.access as Record<string, unknown> | undefined;
  const globalAdmin = global.admin as (Record<string, unknown> & { hidden?: unknown }) | undefined;
  const access: Record<string, unknown> = { ...globalAccess };
  for (const operation of ['read', 'readVersions', 'update']) {
    const previous = access[operation];
    access[operation] = (args: AccessArgs) => isCampaignOnlyStaff(args.req.user)
      ? false
      : typeof previous === 'function'
        ? (previous as (value: AccessArgs) => unknown)(args)
        : Boolean(args.req.user);
  }
  const hidden = globalAdmin?.hidden;
  return { ...global, access, admin: { ...globalAdmin,
    hidden: (args: HiddenArgs) => isCampaignOnlyStaff(args.user)
      || (typeof hidden === 'function' ? Boolean((hidden as (value: HiddenArgs) => unknown)(args)) : Boolean(hidden)),
  } } as T;
}
