'use server';

import { createAdminClient } from '@nusc/db';

export interface AccreditationSubmissionResult {
  success: boolean;
  accreditationId?: string;
  error?: string;
  data?: {
    fullName: string;
    mediaOrgName: string;
    designationRole: string;
    accreditationType: string;
    accreditationId: string;
    submissionDate: string;
    status: string;
  };
}

export async function submitPressAccreditation(
  formData: FormData
): Promise<AccreditationSubmissionResult> {
  try {
    const fullName = (formData.get('fullName') as string)?.trim() || '';
    const phone = (formData.get('phone') as string)?.trim().replace(/\D/g, '') || '';
    const email = (formData.get('email') as string)?.trim().toLowerCase() || '';
    const residentialAddress = (formData.get('residentialAddress') as string)?.trim() || '';

    const mediaOrgName = (formData.get('mediaOrgName') as string)?.trim() || '';
    const mediaOrgType = (formData.get('mediaOrgType') as string)?.trim() || '';
    const mediaOrgTypeOther = (formData.get('mediaOrgTypeOther') as string)?.trim() || '';
    const designationRole = (formData.get('designationRole') as string)?.trim() || '';
    const designationRoleOther = (formData.get('designationRoleOther') as string)?.trim() || '';
    const mediaWebsiteUrl = (formData.get('mediaWebsiteUrl') as string)?.trim() || '';

    const accreditationType = (formData.get('accreditationType') as string)?.trim() || 'season';
    const singleMatchDetails = (formData.get('singleMatchDetails') as string)?.trim() || '';

    const accessRequiredRaw = formData.getAll('accessRequired') as string[];
    
    // Process equipmentCarried from either input field (text / comma-separated) or multi-values
    const rawEquipmentList = formData.getAll('equipmentCarried') as string[];
    const equipmentCarriedList: string[] = [];
    for (const raw of rawEquipmentList) {
      if (typeof raw === 'string') {
        const splitItems = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        if (splitItems.length > 0) {
          equipmentCarriedList.push(...splitItems);
        } else if (raw.trim()) {
          equipmentCarriedList.push(raw.trim());
        }
      }
    }
    const equipmentOther = (formData.get('equipmentOther') as string)?.trim() || '';

    const termsAccepted = formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true';
    const consentGiven = formData.get('consentGiven') === 'on' || formData.get('consentGiven') === 'true';

    const applicantSignatureName = (formData.get('applicantSignatureName') as string)?.trim() || fullName;
    const declarationDate = (formData.get('declarationDate') as string)?.trim() || new Date().toISOString().split('T')[0];

    // Files
    const photoFile = formData.get('photo') as File | null;
    const govtIdFile = formData.get('govtId') as File | null;
    const mediaIdLetterFile = formData.get('mediaIdLetter') as File | null;

    // --- Validation ---
    if (!fullName || fullName.length < 2) {
      return { success: false, error: 'Please enter your full legal name (minimum 2 characters).' };
    }

    if (!phone || phone.length < 10) {
      return { success: false, error: 'Please provide a valid 10-digit mobile / WhatsApp number.' };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Please enter a valid official email address.' };
    }

    if (!residentialAddress || residentialAddress.length < 5) {
      return { success: false, error: 'Please enter your full residential address.' };
    }

    if (!photoFile || photoFile.size === 0) {
      return { success: false, error: 'A recent passport-size photograph is required.' };
    }

    if (!govtIdFile || govtIdFile.size === 0) {
      return { success: false, error: 'A valid government-issued ID upload is required.' };
    }

    if (!mediaOrgName || mediaOrgName.length < 2) {
      return { success: false, error: 'Please specify the name of your media organisation or publication.' };
    }

    if (!mediaOrgType || mediaOrgType.length < 2) {
      return { success: false, error: 'Please enter your media organisation type.' };
    }

    if (mediaOrgType === 'Other' && !mediaOrgTypeOther) {
      return { success: false, error: 'Please describe your media organisation type in the "Other" field.' };
    }

    if (!designationRole || designationRole.length < 2) {
      return { success: false, error: 'Please enter your professional designation / role.' };
    }

    if (designationRole === 'Other' && !designationRoleOther) {
      return { success: false, error: 'Please describe your designation in the "Other" field.' };
    }

    if (!mediaWebsiteUrl) {
      return { success: false, error: 'Please provide official media organisation website or social media profile link.' };
    }

    if (!mediaIdLetterFile || mediaIdLetterFile.size === 0) {
      return { success: false, error: 'Official media ID card or editor authorisation letter is required.' };
    }

    if (accreditationType === 'single_match' && !singleMatchDetails) {
      return { success: false, error: 'Please specify the match or date for single-match accreditation.' };
    }

    if (accessRequiredRaw.length === 0) {
      return { success: false, error: 'Please select at least one required access area.' };
    }

    if (equipmentCarriedList.length === 0) {
      return { success: false, error: 'Please enter the equipment to be carried into the stadium.' };
    }

    if (!termsAccepted) {
      return { success: false, error: 'You must read and agree to the accreditation terms and conditions.' };
    }

    if (!consentGiven) {
      return { success: false, error: 'You must consent to NUSC using your submitted details for accreditation verification.' };
    }

    if (!applicantSignatureName) {
      return { success: false, error: "Please enter applicant's signature name in the declaration." };
    }

    // Max file size: 5MB each
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (photoFile.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Passport photo must be under 5MB in size.' };
    }
    if (govtIdFile.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Government ID document must be under 5MB in size.' };
    }
    if (mediaIdLetterFile.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Media ID / Authorisation letter must be under 5MB in size.' };
    }

    // Generate authoritative unique Accreditation ID
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const accreditationId = `NUSC-MEDIA-2026-${randomSuffix}`;

    const effectiveOrgType = mediaOrgType === 'Other' ? `Other: ${mediaOrgTypeOther}` : mediaOrgType;
    const effectiveRole = designationRole === 'Other' ? `Other: ${designationRoleOther}` : designationRole;

    // Database persistence via Supabase Admin Client
    try {
      const supabase = createAdminClient();

      // Upload documents to Supabase Storage press_documents bucket
      const uploadDocument = async (file: File | null, prefix: string): Promise<string | null> => {
        if (!file || file.size === 0) return null;
        try {
          const ext = file.name.split('.').pop() || 'bin';
          const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
          const storagePath = `${accreditationId}/${prefix}_${Date.now()}.${cleanExt}`;
          const buffer = Buffer.from(await file.arrayBuffer());
          const { error: uploadError } = await supabase.storage
            .from('press_documents')
            .upload(storagePath, buffer, {
              contentType: file.type || 'application/octet-stream',
              upsert: true,
            });

          if (uploadError) {
            console.error(`Storage upload error for ${prefix}:`, uploadError);
            return null;
          }

          const { data: publicUrlData } = supabase.storage
            .from('press_documents')
            .getPublicUrl(storagePath);

          return publicUrlData.publicUrl;
        } catch (uploadErr) {
          console.error(`Failed to upload ${prefix}:`, uploadErr);
          return null;
        }
      };

      const [photoUrl, govtIdUrl, mediaIdLetterUrl] = await Promise.all([
        uploadDocument(photoFile, 'photo'),
        uploadDocument(govtIdFile, 'govt_id'),
        uploadDocument(mediaIdLetterFile, 'media_id_letter'),
      ]);

      const { error: dbError } = await supabase.from('press_accreditations').insert({
        accreditation_id: accreditationId,
        full_name: fullName,
        phone,
        email,
        residential_address: residentialAddress,
        photo_filename: photoFile.name,
        photo_url: photoUrl,
        govt_id_filename: govtIdFile.name,
        govt_id_url: govtIdUrl,
        media_org_name: mediaOrgName,
        media_org_type: effectiveOrgType,
        media_org_type_other: mediaOrgTypeOther || null,
        designation_role: effectiveRole,
        designation_role_other: designationRoleOther || null,
        media_website_url: mediaWebsiteUrl,
        media_id_letter_filename: mediaIdLetterFile.name,
        media_id_letter_url: mediaIdLetterUrl,
        accreditation_type: accreditationType,
        single_match_details: singleMatchDetails || null,
        access_required: accessRequiredRaw,
        equipment_carried: equipmentCarriedList,
        equipment_other: equipmentOther || null,
        terms_accepted: termsAccepted,
        consent_given: consentGiven,
        applicant_signature_name: applicantSignatureName,
        declaration_date: declarationDate,
        status: 'pending',
        approved_access_areas: [],
        validity: accreditationType === 'season' ? 'Season 2026–27' : singleMatchDetails,
        authorised_by: 'NUSC Media Department',
      });

      if (dbError) {
        console.error('Database insert into press_accreditations failed:', dbError);
        // If table error, we still return friendly error or proceed
        return {
          success: false,
          error: 'Failed to record application. Please verify details and try again.',
        };
      }
    } catch (dbErr: any) {
      console.error('Error connecting to database:', dbErr);
      return {
        success: false,
        error: 'System error connecting to media database. Please try again later.',
      };
    }

    return {
      success: true,
      accreditationId,
      data: {
        fullName,
        mediaOrgName,
        designationRole: effectiveRole,
        accreditationType: accreditationType === 'season' ? 'Season Accreditation – All NUSC Home Matches' : `Single Match (${singleMatchDetails})`,
        accreditationId,
        submissionDate: declarationDate,
        status: 'Pending Verification',
      },
    };
  } catch (error: any) {
    console.error('submitPressAccreditation error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during submission. Please try again.',
    };
  }
}
