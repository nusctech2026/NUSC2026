export const CREATOR_CHALLENGE_CATEGORIES = [
  { value: 'poster', label: 'Matchday Poster Challenge' },
  { value: 'football_edits', label: 'Football Edits Challenge' },
  { value: 'fan_voice', label: 'Fan Voice Challenge' },
] as const;

export const CREATOR_CHALLENGE_AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_plus', label: '45+' },
] as const;

export const CREATOR_CHALLENGE_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X' },
  { value: 'other', label: 'Other approved platform' },
] as const;

export const CREATOR_CHALLENGE_DECLARATIONS = [
  { name: 'originalWork', label: 'Original work: I confirm this entry is my original work, or I have secured permission and credited permitted third-party contributions.' },
  { name: 'rightsPermissions', label: 'Rights and permissions: All footage, photographs, music, graphics and other assets are authorised or appropriately licensed. I have not used unauthorised match broadcast or protected material.' },
  { name: 'rulesConduct', label: 'Rules and conduct: I have read and agree to the eligibility requirements, entry rules, judging process and terms below. I understand non-compliant entries may be rejected.' },
  { name: 'contentLicence', label: 'Content-use licence: I retain ownership of my work and grant NUSC a non-exclusive licence to use my submitted entry for club and campaign promotion under these rules, with reasonable attribution. Commercial use beyond the campaign requires separate permission where applicable.' },
  { name: 'accuracyRespect', label: 'Accuracy and respect: My entry contains no plagiarism, hate speech, discriminatory material, fabricated match information or defamatory claims.' },
  { name: 'contactVerification', label: 'Contact and verification: I agree NUSC may contact me about this entry and verify my eligibility and submission details.' },
] as const;

export interface CreatorChallengeSubmission {
  fullName: string;
  creatorHandle: string;
  email: string;
  phone: string;
  ageGroup: string;
  location: string;
  category: string;
  matchday: string;
  publishingPlatform: string;
  publicProfileUrl: string;
  entryTitleDescription: string;
  publishedEntryUrl: string;
  campaignHashtag: string;
  additionalNotes: string;
  guardianConsent: boolean;
  declarations: {
    originalWork: boolean;
    rightsPermissions: boolean;
    rulesConduct: boolean;
    contentLicence: boolean;
    accuracyRespect: boolean;
    contactVerification: boolean;
  };
  termsAccepted: boolean;
}

export type CreatorChallengeValidation =
  | { success: true; data: CreatorChallengeSubmission }
  | { success: false; errors: string[] };

export function creatorChallengeValuesFromFormData(formData: FormData): Record<string, unknown> {
  const value = (name: string) => formData.get(name);
  const checked = (name: string) => value(name) === 'true' || value(name) === 'on';
  return {
    fullName: value('fullName'),
    creatorHandle: value('creatorHandle'),
    email: value('email'),
    phone: value('phone'),
    ageGroup: value('ageGroup'),
    location: value('location'),
    category: value('category'),
    matchday: value('matchday'),
    publishingPlatform: value('publishingPlatform'),
    publicProfileUrl: value('publicProfileUrl'),
    entryTitleDescription: value('entryTitleDescription'),
    publishedEntryUrl: value('publishedEntryUrl'),
    campaignHashtag: value('campaignHashtag'),
    additionalNotes: value('additionalNotes'),
    guardianConsent: checked('guardianConsent'),
    declarations: {
      originalWork: checked('declarationOriginalWork'),
      rightsPermissions: checked('declarationRightsPermissions'),
      rulesConduct: checked('declarationRulesConduct'),
      contentLicence: checked('declarationContentLicence'),
      accuracyRespect: checked('declarationAccuracyRespect'),
      contactVerification: checked('declarationContactVerification'),
    },
    termsAccepted: checked('termsAccepted'),
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateCreatorChallengeSubmission(input: unknown): CreatorChallengeValidation {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const text = (name: string) => typeof raw[name] === 'string' ? (raw[name] as string).trim() : '';
  const declarations = raw.declarations && typeof raw.declarations === 'object'
    ? raw.declarations as Record<string, unknown>
    : {};
  const checked = (name: string) => declarations[name] === true || declarations[name] === 'true' || declarations[name] === 'on';

  const data: CreatorChallengeSubmission = {
    fullName: text('fullName'),
    creatorHandle: text('creatorHandle'),
    email: text('email'),
    phone: text('phone'),
    ageGroup: text('ageGroup'),
    location: text('location'),
    category: text('category'),
    matchday: text('matchday'),
    publishingPlatform: text('publishingPlatform'),
    publicProfileUrl: text('publicProfileUrl'),
    entryTitleDescription: text('entryTitleDescription'),
    publishedEntryUrl: text('publishedEntryUrl'),
    campaignHashtag: text('campaignHashtag'),
    additionalNotes: text('additionalNotes'),
    guardianConsent: raw.guardianConsent === true || raw.guardianConsent === 'true' || raw.guardianConsent === 'on',
    declarations: {
      originalWork: checked('originalWork'),
      rightsPermissions: checked('rightsPermissions'),
      rulesConduct: checked('rulesConduct'),
      contentLicence: checked('contentLicence'),
      accuracyRespect: checked('accuracyRespect'),
      contactVerification: checked('contactVerification'),
    },
    termsAccepted: raw.termsAccepted === true || raw.termsAccepted === 'true' || raw.termsAccepted === 'on',
  };

  const errors: string[] = [];
  if (data.fullName.length < 2 || data.fullName.length > 160) errors.push('Enter your full name (2–160 characters).');
  if (data.creatorHandle.length > 100) errors.push('Creator name or handle must be 100 characters or fewer.');
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Enter a valid email address.');
  const phoneDigits = data.phone.replace(/\D/g, '');
  if (data.phone.length > 32 || phoneDigits.length < 8 || phoneDigits.length > 15) errors.push('Enter a valid phone or WhatsApp number.');
  if (!CREATOR_CHALLENGE_AGE_GROUPS.some(option => option.value === data.ageGroup)) errors.push('Select an age group.');
  if (data.location.length < 2 || data.location.length > 160) errors.push('Enter your town, district and state (2–160 characters).');
  if (!CREATOR_CHALLENGE_CATEGORIES.some(option => option.value === data.category)) errors.push('Select a valid challenge category.');
  if (!/^(?:[1-9]|10)$/.test(data.matchday)) errors.push('Select a valid NUSC home matchday.');
  if (!CREATOR_CHALLENGE_PLATFORMS.some(option => option.value === data.publishingPlatform)) errors.push('Select a publishing platform.');
  if (data.publicProfileUrl.length > 2048 || !isHttpsUrl(data.publicProfileUrl)) errors.push('Enter a valid public profile URL beginning with https://.');
  if (data.entryTitleDescription.length < 5 || data.entryTitleDescription.length > 300) errors.push('Enter an entry title or short description (5–300 characters).');
  if (data.publishedEntryUrl.length > 2048 || !isHttpsUrl(data.publishedEntryUrl)) errors.push('Enter a valid published entry URL beginning with https://.');
  if (!/^#[A-Za-z0-9_]{2,64}$/.test(data.campaignHashtag)) errors.push('Enter the campaign hashtag, beginning with # and containing no spaces.');
  if (data.additionalNotes.length > 1000) errors.push('Additional notes must be 1,000 characters or fewer.');
  if (data.ageGroup === 'under_18' && !data.guardianConsent) errors.push('Parent or guardian consent is required for participants under 18.');
  if (CREATOR_CHALLENGE_DECLARATIONS.some(item => !data.declarations[item.name])) errors.push('Confirm each self-declaration to continue.');
  if (!data.termsAccepted) errors.push('Confirm that you agree to the NUSC Creator Challenge terms.');

  return errors.length ? { success: false, errors } : { success: true, data };
}
