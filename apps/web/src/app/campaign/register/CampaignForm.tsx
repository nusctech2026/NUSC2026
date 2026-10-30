'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createMediaAuthorisationUploadUrl,
  discardCampaignMediaAuthorisationUpload,
  createOfficialCredentialUploadUrl,
  discardOfficialCredentialUpload,
  getCampaignAvailabilityMatches,
  getCampaignRoles,
  submitCampaignApplication,
} from '../actions';
import type { CampaignAvailabilityMatch, CampaignRoleItem } from '../actions';
import { createClient as createBrowserSupabaseClient } from '@nusc/db/src/client/browser';
import '../campaign.css';

export type CampaignCategory =
  | 'ahibi'
  | 'volunteer'
  | 'media'
  | 'crew'
  | 'management'
  | 'officials'
  | 'medical';

interface CampaignFormProps {
  fixedCategory?: CampaignCategory;
}

const CATEGORY_META: Record<CampaignCategory, { label: string; description: string }> = {
  ahibi: {
    label: 'AHIBI',
    description: 'Ticketing, scanning, security, frisking, supervision and entry teams.',
  },
  volunteer: {
    label: 'Volunteers',
    description: 'Stretcher, perimeter, security, supervisory and hospitality teams.',
  },
  media: {
    label: 'Press and Media',
    description: 'Press, print, broadcast and independent media personnel covering NUSC home matches.',
  },
  crew: {
    label: 'Crew',
    description: 'Lights, LED, sound, technical support and other crew roles.',
  },
  management: {
    label: 'Management',
    description: 'Club and public-sector management representatives.',
  },
  officials: {
    label: 'Match Officials',
    description: 'Referees, assistant referees, match commissioners and assessors.',
  },
  medical: {
    label: 'Medical Team',
    description: 'Medical officers, physiotherapy, first aid and ambulance personnel.',
  },
};

const DEPARTMENTS = Object.entries(CATEGORY_META) as [CampaignCategory, (typeof CATEGORY_META)[CampaignCategory]][];
const MANAGEMENT_ORGANISATIONS = [
  'Chümoukedima District Football Association (CDFA)',
  'Department of Youth Resources & Sports',
  'Others',
];
const MEDIA_ACCESS_OPTIONS = [
  { value: 'media_press_seating', label: 'Media / Press Seating', description: 'Reserved covered press bench with desk space and power outlet' },
  { value: 'photography_area', label: 'Photography Area', description: 'Designated pitchside photographer bib zones behind goal lines' },
  { value: 'press_conference_area', label: 'Press Conference Area', description: 'Post-match press briefing room with head coach and captain' },
  { value: 'mixed_zone_interview_area', label: 'Mixed Zone / Post-Match Interview Area', description: 'Player walkthrough tunnel interview mixed zone' },
  { value: 'broadcast_video_coverage_area', label: 'Broadcast / Video Coverage Area', description: 'Gantry and camera platforms for approved broadcast units' },
] as const;
const MEDIA_ORGANISATION_TYPES = [
  { value: 'kaki', label: 'Kaki' },
  { value: 'print_media', label: 'Print Media' },
  { value: 'press_media', label: 'Press Media' },
  { value: 'broadcast_tv', label: 'Broadcast / TV' },
  { value: 'digital_online_media', label: 'Digital / Online Media' },
  { value: 'independent_freelance', label: 'Independent / Freelance' },
  { value: 'other', label: 'Other' },
] as const;

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(0, 12);
}

export default function CampaignForm({ fixedCategory }: CampaignFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState<CampaignCategory | ''>(fixedCategory || '');
  const [roles, setRoles] = useState<CampaignRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(Boolean(fixedCategory));
  const [preferredRoleId, setPreferredRoleId] = useState('');
  const [availabilityMatches, setAvailabilityMatches] = useState<CampaignAvailabilityMatch[]>([]);
  const [loadingAvailabilityMatches, setLoadingAvailabilityMatches] = useState(true);
  const [availabilityMode, setAvailabilityMode] = useState<'' | 'all' | 'selected'>('');
  const [availabilityMatchIds, setAvailabilityMatchIds] = useState<string[]>([]);
  const [mediaAccessTypes, setMediaAccessTypes] = useState<string[]>([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otherRole, setOtherRole] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [organisationOther, setOrganisationOther] = useState('');
  const [designation, setDesignation] = useState('');
  const [mediaDesignation, setMediaDesignation] = useState('');
  const [mediaOutlet, setMediaOutlet] = useState('');
  const [mediaOrganisationType, setMediaOrganisationType] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [professionalBody, setProfessionalBody] = useState('');
  const [professionalQualification, setProfessionalQualification] = useState('');
  const [professionalRegistrationNumber, setProfessionalRegistrationNumber] = useState('');
  const [professionalExperience, setProfessionalExperience] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState<'' | 'yes' | 'no'>('');
  const [conflictDetails, setConflictDetails] = useState('');
  const [technicalSpecialty, setTechnicalSpecialty] = useState('');
  const [experience, setExperience] = useState('');
  const [crewWorkArrangement, setCrewWorkArrangement] = useState<'' | 'organisation' | 'independent'>('');
  const [crewOrganisation, setCrewOrganisation] = useState('');
  const [crewLeadName, setCrewLeadName] = useState('');
  const [crewLeadPhone, setCrewLeadPhone] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [mediaAuthorisationFile, setMediaAuthorisationFile] = useState<File | null>(null);
  const [officialCredentialFile, setOfficialCredentialFile] = useState<File | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const submissionKeyRef = useRef<string | null>(null);
  const submissionInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fixedCategory) return;
    const requestedCategory = new URLSearchParams(window.location.search).get('department');
    if (requestedCategory && Object.prototype.hasOwnProperty.call(CATEGORY_META, requestedCategory)) {
      setCategory(requestedCategory as CampaignCategory);
    }
  }, [fixedCategory]);

  useEffect(() => {
    let active = true;
    getCampaignAvailabilityMatches()
      .then((matches) => { if (active) setAvailabilityMatches(matches); })
      .catch(() => { if (active) setAvailabilityMatches([]); })
      .finally(() => { if (active) setLoadingAvailabilityMatches(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!category || category === 'management') {
      setRoles([]);
      setPreferredRoleId('');
      setLoadingRoles(false);
      return () => { active = false; };
    }
    async function loadRoles() {
      setLoadingRoles(true);
      setErrorMessage(null);
      setRoles([]);
      setPreferredRoleId('');
      try {
        const fetched = await getCampaignRoles(category);
        if (active) {
          setRoles(fetched);
          setPreferredRoleId('');
        }
      } catch (error) {
        console.error('Failed to load workforce roles:', error);
        if (active) setErrorMessage('Roles are temporarily unavailable. Please try again later.');
      } finally {
        if (active) setLoadingRoles(false);
      }
    }
    void loadRoles();
    return () => {
      active = false;
    };
  }, [category]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const selectedRole = roles.find((role) => role.id === preferredRoleId);
  const isOtherRoleSelected = selectedRole?.code.endsWith('_others') || selectedRole?.name === 'Others';
  const isManagement = category === 'management';
  const usesRoleSelection = Boolean(category && !isManagement);
  const needsOtherOrganisation = isManagement && organisation === 'Others';
  const meta = category ? CATEGORY_META[category] : {
    label: 'Choose a department',
    description: 'Choose a department to see its roles and any department-specific fields.',
  };
  const inlineError = (field: string) => fieldErrors[field]
    ? <p id={`${field}-error`} className="form-error" role="alert" tabIndex={-1}>{fieldErrors[field]}</p>
    : null;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtension = /\.(jpe?g|png)$/i.test(file.name);
    const validType = !file.type || ['image/jpeg', 'image/png'].includes(file.type);
    if (!validType || !validExtension) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setErrorMessage('Upload a JPG, JPEG or PNG photograph.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setErrorMessage('Photograph must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    if (file.size < 1) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setErrorMessage('Photograph must contain image data.');
      event.target.value = '';
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleMediaAuthorisationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setMediaAuthorisationFile(null);
      return;
    }

    const validExtension = /\.(pdf|jpe?g|png)$/i.test(file.name);
    const validType = !file.type || ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
    if (!validExtension || !validType) {
      setMediaAuthorisationFile(null);
      setErrorMessage('Upload a PDF, JPG, JPEG or PNG media ID card or authorisation letter.');
      event.target.value = '';
      return;
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setMediaAuthorisationFile(null);
      setErrorMessage('The media ID card or authorisation letter must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setMediaAuthorisationFile(file);
    setErrorMessage(null);
  };

  const handleOfficialCredentialChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setOfficialCredentialFile(null);
      return;
    }

    const validExtension = /\.(pdf|jpe?g|png)$/i.test(file.name);
    const validType = !file.type || ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
    if (!validExtension || !validType) {
      setOfficialCredentialFile(null);
      setErrorMessage('Upload a PDF, JPG, JPEG or PNG match-official credential.');
      event.target.value = '';
      return;
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setOfficialCredentialFile(null);
      setErrorMessage('The match-official credential must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setOfficialCredentialFile(file);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlightRef.current) return;
    setErrorMessage(null);
    setFieldErrors({});

    const rejectField = (field: string, message: string) => {
      setFieldErrors({ [field]: message });
      setErrorMessage(message);
      requestAnimationFrame(() => (document.getElementById(field) || document.getElementById(`${field}-error`))?.focus());
    };

    if (fullName.trim().length < 2 || fullName.trim().length > 255) {
      rejectField('fullName', 'Enter your full name using 2 to 255 characters.');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      rejectField('phone', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      rejectField('email', 'Enter a valid email address.');
      return;
    }

    if (!declarationAccepted) {
      rejectField('declaration', 'Please confirm that the information you submitted is correct.');
      setErrorMessage('Please confirm that the information you submitted is correct.');
      return;
    }
    if (!photoFile) {
      rejectField('photo', 'A profile photograph is required.');
      setErrorMessage('A profile photograph is required.');
      return;
    }
    if (category === 'media' && !mediaAuthorisationFile) {
      rejectField('mediaAuthorisationFile', 'Upload an official media ID card or authorisation letter.');
      setErrorMessage('Upload an official media ID card or authorisation letter.');
      return;
    }
    if (!availabilityMode) {
      rejectField('availabilityMode', 'Choose your match availability.');
      setErrorMessage('Choose your match availability.');
      return;
    }
    if (availabilityMode === 'selected' && availabilityMatchIds.length === 0) {
      rejectField('availabilityMatchIds', 'Select at least one match or choose All 10 matches.');
      setErrorMessage('Select at least one match or choose another availability option.');
      return;
    }
    if (isOtherRoleSelected && otherRole.trim().length < 2) {
      rejectField('otherRole', 'Please specify your role using at least 2 characters.');
      setErrorMessage('Please specify your role.');
      return;
    }
    if (isManagement && (!organisation || !designation.trim())) {
      rejectField(!organisation ? 'organisation' : 'designation', 'Select an organisation and enter your designation.');
      setErrorMessage('Select an organisation and enter your designation.');
      return;
    }
    if (isManagement && (designation.trim().length < 2 || designation.trim().length > 255)) {
      rejectField('designation', 'Enter a designation using 2 to 255 characters.');
      return;
    }
    if (needsOtherOrganisation && organisationOther.trim().length < 2) {
      rejectField('organisationOther', 'Please specify your organisation using at least 2 characters.');
      setErrorMessage('Please specify your organisation.');
      return;
    }
    if (category === 'media' && mediaOutlet.trim().length < 2) {
      rejectField('mediaOutlet', 'Enter the name of your media organisation or publication.');
      setErrorMessage('Enter the name of your media organisation or publication.');
      return;
    }
    if (category === 'media' && !mediaOrganisationType) {
      rejectField('mediaOrganisationType', 'Choose the type of media organisation.');
      setErrorMessage('Choose the type of media organisation.');
      return;
    }
    if (category === 'media' && (mediaDesignation.trim().length < 2 || mediaDesignation.trim().length > 255)) {
      rejectField('mediaDesignation', 'Enter your designation or role (2 to 255 characters).');
      setErrorMessage('Enter your designation or role (2 to 255 characters).');
      return;
    }
    if (category === 'media' && mediaAccessTypes.length === 0) {
      rejectField('mediaAccessTypes', 'Select at least one access area for your accreditation request.');
      setErrorMessage('Select at least one access area for your accreditation request.');
      return;
    }
    if (category === 'officials' && (professionalBody.trim().length < 2 || professionalBody.trim().length > 255)) {
      rejectField('professionalBody', 'Enter your association or governing body using 2 to 255 characters.');
      return;
    }
    if (category === 'officials' && (professionalQualification.trim().length < 2 || professionalQualification.trim().length > 255)) {
      rejectField('professionalQualification', 'Enter your qualification or grade using 2 to 255 characters.');
      return;
    }
    if (category === 'officials' && (professionalExperience.trim().length < 2 || professionalExperience.trim().length > 2000)) {
      rejectField('professionalExperience', 'Describe your recent officiating experience (2 to 2,000 characters).');
      setErrorMessage('Describe your recent officiating experience (2 to 2,000 characters).');
      return;
    }
    if (category === 'officials' && !conflictOfInterest) {
      rejectField('conflictOfInterest', 'Please answer the conflict-of-interest declaration.');
      setErrorMessage('Please answer the conflict-of-interest declaration.');
      return;
    }
    if (category === 'officials' && conflictOfInterest === 'yes'
      && (conflictDetails.trim().length < 2 || conflictDetails.trim().length > 2000)) {
      rejectField('conflictDetails', 'Describe the club or relationship connected to your conflict of interest.');
      setErrorMessage('Describe the club or relationship connected to your conflict of interest.');
      return;
    }
    if (category === 'medical' && (professionalQualification.trim().length < 2 || professionalQualification.trim().length > 255)) {
      rejectField('professionalQualification', 'Enter your medical qualification or certification using 2 to 255 characters.');
      return;
    }
    if (category === 'crew' && !crewWorkArrangement) {
      rejectField('crewWorkArrangement', 'Choose whether you are working through an organisation or independently.');
      setErrorMessage('Choose whether you are working through an organisation or independently.');
      return;
    }
    if (category === 'crew' && crewWorkArrangement === 'organisation'
      && (crewOrganisation.trim().length < 2 || crewOrganisation.trim().length > 255
        || crewLeadName.trim().length < 2 || crewLeadName.trim().length > 255
        || !/^\d{10}$/.test(crewLeadPhone.replace(/\D/g, '')))) {
      const field = crewOrganisation.trim().length < 2 || crewOrganisation.trim().length > 255
        ? 'crewOrganisation'
        : crewLeadName.trim().length < 2 || crewLeadName.trim().length > 255
          ? 'crewLeadName' : 'crewLeadPhone';
      rejectField(field, 'Enter the organisation and crew lead contact details.');
      setErrorMessage('Enter the organisation name and a crew lead name with a valid 10-digit phone number.');
      return;
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    let mediaAuthorisationPath: string | null = null;
    let officialCredentialPath: string | null = null;
    try {
      if (category === 'media' && mediaAuthorisationFile) {
        const uploadAuthorization = await createMediaAuthorisationUploadUrl(
          mediaAuthorisationFile.name,
          mediaAuthorisationFile.size,
          phone,
        );
        if (!uploadAuthorization.success) {
          setErrorMessage(uploadAuthorization.error);
          setIsSubmitting(false);
          errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        mediaAuthorisationPath = uploadAuthorization.path;
        const { error: uploadError } = await createBrowserSupabaseClient().storage
          .from('campaign_documents')
          .uploadToSignedUrl(uploadAuthorization.path, uploadAuthorization.token, mediaAuthorisationFile, {
            contentType: uploadAuthorization.contentType,
          });
        if (uploadError) {
          await discardCampaignMediaAuthorisationUpload(mediaAuthorisationPath);
          mediaAuthorisationPath = null;
          setErrorMessage('Media ID card or authorisation letter upload failed. Please try again.');
          setIsSubmitting(false);
          errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      if (category === 'officials' && officialCredentialFile) {
        const uploadAuthorization = await createOfficialCredentialUploadUrl(
          officialCredentialFile.name,
          officialCredentialFile.size,
          phone,
        );
        if (!uploadAuthorization.success) {
          setErrorMessage(uploadAuthorization.error);
          setIsSubmitting(false);
          errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        officialCredentialPath = uploadAuthorization.path;
        const { error: uploadError } = await createBrowserSupabaseClient().storage
          .from('campaign_documents')
          .uploadToSignedUrl(uploadAuthorization.path, uploadAuthorization.token, officialCredentialFile, {
            contentType: uploadAuthorization.contentType,
          });
        if (uploadError) {
          await discardOfficialCredentialUpload(officialCredentialPath);
          officialCredentialPath = null;
          setErrorMessage('Match-official credential upload failed. Please try again.');
          setIsSubmitting(false);
          errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      const formData = new FormData();
      if (!submissionKeyRef.current) submissionKeyRef.current = crypto.randomUUID();
      formData.append('idempotencyKey', submissionKeyRef.current);
      formData.append('fullName', fullName);
      formData.append('phone', phone);
      formData.append('email', email.trim().toLowerCase());
      formData.append('category', category);
      if (usesRoleSelection && preferredRoleId) formData.append('preferredRoleId', preferredRoleId);
      if (isOtherRoleSelected) formData.append('otherRole', otherRole);
      if (isManagement) {
        formData.append('organisation', organisation);
        if (needsOtherOrganisation) formData.append('organisationOther', organisationOther);
        formData.append('designation', designation);
      }
      formData.append('availabilityMode', availabilityMode);
      availabilityMatchIds.forEach((matchId) => formData.append('availabilityMatchId', matchId));
      if (category === 'media') {
        formData.append('mediaOutlet', mediaOutlet);
        formData.append('mediaOrganisationType', mediaOrganisationType);
        formData.append('mediaDesignation', mediaDesignation);
        if (mediaAuthorisationPath) formData.append('mediaAuthorisationPath', mediaAuthorisationPath);
        formData.append('portfolioUrl', portfolioUrl);
        mediaAccessTypes.forEach((accessType) => formData.append('mediaAccessType', accessType));
      }
      if (category === 'officials' || category === 'medical') {
        formData.append('professionalBody', professionalBody);
        formData.append('professionalQualification', professionalQualification);
        formData.append('professionalRegistrationNumber', professionalRegistrationNumber);
      }
      if (category === 'officials') {
        formData.append('professionalExperience', professionalExperience);
        formData.append('conflictOfInterest', conflictOfInterest);
        formData.append('conflictDetails', conflictDetails);
        if (officialCredentialPath) formData.append('officialCredentialPath', officialCredentialPath);
      }
      if (category === 'crew') {
        formData.append('technicalSpecialty', technicalSpecialty);
        formData.append('experience', experience);
        formData.append('crewWorkArrangement', crewWorkArrangement);
        if (crewWorkArrangement === 'organisation') {
          formData.append('crewOrganisation', crewOrganisation);
          formData.append('crewLeadName', crewLeadName);
          formData.append('crewLeadPhone', crewLeadPhone.replace(/\D/g, ''));
        }
      }
      formData.append('termsAccepted', 'true');
      formData.append('photo', photoFile);

      const result = await submitCampaignApplication(formData);
      if (!result.success || !result.applicationNumber) {
        if (mediaAuthorisationPath) await discardCampaignMediaAuthorisationUpload(mediaAuthorisationPath);
        if (officialCredentialPath) await discardOfficialCredentialUpload(officialCredentialPath);
        setErrorMessage(result.error || 'Registration could not be submitted. Please check your details and try again.');
        setIsSubmitting(false);
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      router.push(
        '/campaign/application-success?num='
        + encodeURIComponent(result.applicationNumber)
        + '&cat=' + encodeURIComponent(category)
        + '&name=' + encodeURIComponent(fullName)
      );
    } catch (error) {
      if (mediaAuthorisationPath) {
        try {
          await discardCampaignMediaAuthorisationUpload(mediaAuthorisationPath);
        } catch {
          // The upload remains private if cleanup cannot be reached.
        }
      }
      if (officialCredentialPath) {
        try {
          await discardOfficialCredentialUpload(officialCredentialPath);
        } catch {
          // The credential remains private if cleanup cannot be reached.
        }
      }
      console.error('Workforce registration submission failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Registration could not be submitted. Please try again.');
      setIsSubmitting(false);
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="workforce-portal">
      <header className="workforce-hero">
        <div className="workforce-shell workforce-hero-layout">
          <div className="workforce-hero-copy">
            <p className="workforce-eyebrow">NUSC <span aria-hidden="true">/</span> Official workforce registration portal</p>
            <p className="workforce-season">Indian Football League <span aria-hidden="true">2026&#8211;27</span></p>
            <h1>Workforce<br /><span>registration</span></h1>
            <p className="workforce-hero-description">
              Register to work across NUSC home matches. Submit your details once; NUSC administrators will review your registration before assigning accreditation.
            </p>
          </div>
          <div className="workforce-event-card" aria-label="Season details">
            <div className="workforce-event-mark" aria-hidden="true">N</div>
            <dl>
              <div>
                <dt>Venue</dt>
                <dd>Ch&#252;moukedima Football Stadium</dd>
              </div>
              <div>
                <dt>Season coverage</dt>
                <dd>All 10 NUSC home matches</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <div className="workforce-shell workforce-main">
        <ol className="workforce-steps" aria-label="Registration process">
          <li><span>01</span><div><strong>Submit details</strong><small>Choose your department and role</small></div></li>
          <li><span>02</span><div><strong>Admin review</strong><small>Your registration stays pending</small></div></li>
          <li><span>03</span><div><strong>Get accredited</strong><small>Access is assigned by NUSC</small></div></li>
        </ol>

        <div className="workforce-layout">
          <div className="workforce-form-column">
    <div className="campaign-container workforce-form-container">
      <div className="workforce-form-intro">
        <div className="campaign-badge">NUSC IFL 2026–27 · {category === 'media' ? 'Media Accreditation' : 'Workforce'}</div>
        <h2 className="workforce-form-title">
          {category === 'media' ? 'Press & Media Registration' : 'Workforce Registration'}
        </h2>
        <p className="workforce-form-description">
          Register for matchday work at Chümoukedima Football Stadium. Submissions are pending verification; accreditation is issued only after administrator approval.
        </p>
      </div>

      {errorMessage && (
        <div ref={errorRef} className="alert-box error" role="alert" style={{ marginBottom: '18px' }}>
          <strong>Registration notice:</strong> {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onChange={() => {
          setFieldErrors({});
          setErrorMessage(null);
          if (!submissionInFlightRef.current) submissionKeyRef.current = null;
        }}
        className="form-card"
      >
        <h2 className="form-section-title">1. Personal details</h2>

        <div className="form-group">
          <label htmlFor="fullName">Full name <span className="req" aria-hidden="true">*</span></label>
          <input
            id="fullName"
            type="text"
            className="form-control"
            autoComplete="name"
            minLength={2}
            maxLength={255}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
            onInvalid={() => setFieldErrors((current) => ({ ...current, fullName: 'Enter your full name using 2 to 255 characters.' }))}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          {inlineError('fullName')}
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="phone">Phone number <span className="req" aria-hidden="true">*</span></label>
            <input
              id="phone"
              type="tel"
              className="form-control"
              autoComplete="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={12}
              placeholder="10-digit mobile number"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              onInvalid={() => setFieldErrors((current) => ({ ...current, phone: 'Enter a valid 10-digit mobile number.' }))}
              value={phone}
              onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
              required
            />
            {inlineError('phone')}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email address <span className="req" aria-hidden="true">*</span></label>
            <input
              id="email"
              type="email"
              className="form-control"
              autoComplete="email"
              maxLength={255}
              placeholder="you@example.com"
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              onInvalid={() => setFieldErrors((current) => ({ ...current, email: 'Enter a valid email address.' }))}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {inlineError('email')}
          </div>
        </div>

        <h2 className="form-section-title">2. Department details</h2>
        {!fixedCategory ? (
          <div className="form-group">
            <label htmlFor="department">Department <span className="req" aria-hidden="true">*</span></label>
            <select
              id="department"
              className="form-control"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value as CampaignCategory | '';
                setCategory(nextCategory);
                setRoles([]);
                setPreferredRoleId('');
                setLoadingRoles(Boolean(nextCategory && nextCategory !== 'management'));
                setOtherRole('');
                setOrganisation('');
                setOrganisationOther('');
                setDesignation('');
                setMediaDesignation('');
                setMediaOutlet('');
                setMediaOrganisationType('');
                setMediaAuthorisationFile(null);
                setPortfolioUrl('');
                setMediaAccessTypes([]);
                setProfessionalBody('');
                setProfessionalQualification('');
                setProfessionalRegistrationNumber('');
                setProfessionalExperience('');
                setConflictOfInterest('');
                setConflictDetails('');
                setOfficialCredentialFile(null);
                setTechnicalSpecialty('');
                setExperience('');
                setCrewWorkArrangement('');
                setCrewOrganisation('');
                setCrewLeadName('');
                setCrewLeadPhone('');
              }}
              required
            >
              <option value="">Choose a department</option>
              {DEPARTMENTS.map(([value, department]) => (
                <option key={value} value={value}>{department.label}</option>
              ))}
            </select>
            <div className="form-hint">{meta.description}</div>
          </div>
        ) : (
          <div className="form-group">
            <label>Department</label>
            <div className="form-control" aria-readonly="true">{meta.label}</div>
            <div className="form-hint">{meta.description}</div>
          </div>
        )}

        {usesRoleSelection && loadingRoles && (
          <div className="form-group" role="status" aria-live="polite">
            <div className="form-hint">Loading available roles…</div>
          </div>
        )}

        {usesRoleSelection && !loadingRoles && roles.length > 0 && (
          <div className="form-group">
            <label htmlFor="preferredRoleId">Role <span className="req" aria-hidden="true">*</span></label>
            <select
              id="preferredRoleId"
              className="form-control"
              value={preferredRoleId}
              aria-invalid={Boolean(fieldErrors.preferredRoleId)}
              aria-describedby={fieldErrors.preferredRoleId ? 'preferredRoleId-error' : undefined}
              onInvalid={() => setFieldErrors((current) => ({ ...current, preferredRoleId: 'Choose a role for your department.' }))}
              onChange={(event) => {
                setPreferredRoleId(event.target.value);
                setOtherRole('');
              }}
              required
            >
              <option value="">Choose a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            {inlineError('preferredRoleId')}
          </div>
        )}

        {isOtherRoleSelected && (
          <div className="form-group">
            <label htmlFor="otherRole">Specify role <span className="req" aria-hidden="true">*</span></label>
            <input
              id="otherRole"
              type="text"
              className="form-control"
              minLength={2}
              maxLength={255}
              aria-invalid={Boolean(fieldErrors.otherRole)}
              aria-describedby={fieldErrors.otherRole ? 'otherRole-error' : undefined}
              onInvalid={() => setFieldErrors((current) => ({ ...current, otherRole: 'Specify your role using at least 2 characters.' }))}
              value={otherRole}
              onChange={(event) => setOtherRole(event.target.value)}
              required
            />
            {inlineError('otherRole')}
          </div>
        )}

        {isManagement && (
          <>
            <div className="form-group">
              <label htmlFor="organisation">Organisation / affiliation <span className="req" aria-hidden="true">*</span></label>
              <select
                id="organisation"
                className="form-control"
                value={organisation}
                aria-invalid={Boolean(fieldErrors.organisation)}
                aria-describedby={fieldErrors.organisation ? 'organisation-error' : undefined}
                onInvalid={() => setFieldErrors((current) => ({ ...current, organisation: 'Choose an organisation.' }))}
                onChange={(event) => setOrganisation(event.target.value)}
                required
              >
                <option value="">Choose an organisation</option>
                {MANAGEMENT_ORGANISATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {inlineError('organisation')}
            </div>
            {needsOtherOrganisation && (
              <div className="form-group">
                <label htmlFor="organisationOther">Specify organisation <span className="req" aria-hidden="true">*</span></label>
                <input
                  id="organisationOther"
                  type="text"
                  className="form-control"
                  minLength={2}
                  maxLength={255}
                  aria-invalid={Boolean(fieldErrors.organisationOther)}
                  aria-describedby={fieldErrors.organisationOther ? 'organisationOther-error' : undefined}
                  value={organisationOther}
                  onChange={(event) => setOrganisationOther(event.target.value)}
                  required
                />
                {inlineError('organisationOther')}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="designation">Designation / position <span className="req" aria-hidden="true">*</span></label>
              <input
                id="designation"
                type="text"
                className="form-control"
                minLength={2}
                maxLength={255}
                aria-invalid={Boolean(fieldErrors.designation)}
                aria-describedby={fieldErrors.designation ? 'designation-error' : undefined}
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                required
              />
              {inlineError('designation')}
            </div>
          </>
        )}

        {category === 'media' && (
          <>
            <div className="workforce-department-fields">
              <h3 className="form-section-title">Media details</h3>
              <div className="form-group">
                <label htmlFor="mediaOutlet">Name of Media Organisation / Publication <span className="req" aria-hidden="true">*</span></label>
                <input
                  id="mediaOutlet"
                  type="text"
                  className="form-control"
                  minLength={2}
                  maxLength={255}
                  aria-invalid={Boolean(fieldErrors.mediaOutlet)}
                  aria-describedby={fieldErrors.mediaOutlet ? 'mediaOutlet-error' : undefined}
                  value={mediaOutlet}
                  onChange={(event) => setMediaOutlet(event.target.value)}
                  placeholder="Enter the organisation or publication name"
                  required
                />
                {inlineError('mediaOutlet')}
              </div>
              <div className="form-group">
                <label htmlFor="mediaOrganisationType">Type of Media Organisation <span className="req" aria-hidden="true">*</span></label>
                <select
                  id="mediaOrganisationType"
                  className="form-control"
                  value={mediaOrganisationType}
                  aria-invalid={Boolean(fieldErrors.mediaOrganisationType)}
                  aria-describedby={fieldErrors.mediaOrganisationType ? 'mediaOrganisationType-error' : undefined}
                  onInvalid={() => setFieldErrors((current) => ({ ...current, mediaOrganisationType: 'Choose a media organisation type.' }))}
                  onChange={(event) => setMediaOrganisationType(event.target.value)}
                  required
                >
                  <option value="">Choose a media organisation type</option>
                  {MEDIA_ORGANISATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {inlineError('mediaOrganisationType')}
              </div>
              <div className="form-group">
                <label htmlFor="mediaDesignation">Designation / Role <span className="req" aria-hidden="true">*</span></label>
                <input
                  id="mediaDesignation"
                  type="text"
                  className="form-control"
                  value={mediaDesignation}
                  onChange={(event) => setMediaDesignation(event.target.value)}
                  minLength={2}
                  maxLength={255}
                  aria-invalid={Boolean(fieldErrors.mediaDesignation)}
                  aria-describedby={fieldErrors.mediaDesignation ? 'mediaDesignation-error' : undefined}
                  placeholder="e.g. Journalist / Reporter, Photographer, Videographer, Editor"
                  required
                />
                {inlineError('mediaDesignation')}
                <div className="form-hint">Examples: Journalist / Reporter, Photographer, Videographer / Camera Operator, Editor / Producer, Presenter / Anchor.</div>
              </div>
              <div className="form-group">
                <label htmlFor="mediaAuthorisationFile">Official Media ID Card / Authorisation Letter <span className="req" aria-hidden="true">*</span></label>
                <input
                  id="mediaAuthorisationFile"
                  type="file"
                  className="form-control"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  aria-describedby="media-authorisation-help"
                  aria-invalid={Boolean(fieldErrors.mediaAuthorisationFile)}
                  onInvalid={() => setFieldErrors((current) => ({ ...current, mediaAuthorisationFile: 'Upload an official media ID card or authorisation letter.' }))}
                  onChange={handleMediaAuthorisationChange}
                  required
                />
                <div id="media-authorisation-help" className="form-hint">Upload one official media ID card or authorisation letter as a PDF, JPG, JPEG or PNG file (maximum 10 MB). It is stored privately for authorised application reviewers.</div>
                {inlineError('mediaAuthorisationFile')}
              </div>
              <div className="form-group">
                <label htmlFor="portfolioUrl">Published work or public profile <span className="hint">(optional)</span></label>
                <input
                  id="portfolioUrl"
                  type="url"
                  className="form-control"
                  inputMode="url"
                  maxLength={2048}
                  value={portfolioUrl}
                  onChange={(event) => setPortfolioUrl(event.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="workforce-department-fields">
              <h3 className="form-section-title">Type of Accreditation Requested</h3>
              <fieldset className="workforce-access-required" aria-describedby="media-access-help">
                <legend>Access Required (Subject to Approval) <span className="req" aria-hidden="true">*</span></legend>
                <p id="media-access-help" className="workforce-availability-help">All zones are subject to security clearance. Select every access area you need; at least one is required.</p>
                <div className="workforce-access-options">
                  {MEDIA_ACCESS_OPTIONS.map((option) => (
                    <label key={option.value} className="workforce-access-option">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={mediaAccessTypes.includes(option.value)}
                        onChange={(event) => setMediaAccessTypes((current) => event.target.checked
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value))}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {inlineError('mediaAccessTypes')}
            </div>
          </>
        )}

        {category === 'officials' && (
          <div className="workforce-department-fields">
            <h3 className="form-section-title">Officiating qualifications and experience</h3>
            <div className="form-group">
              <label htmlFor="professionalBody">Association / governing body <span className="req" aria-hidden="true">*</span></label>
              <input
                id="professionalBody"
                type="text"
                className="form-control"
                minLength={2}
                maxLength={255}
                aria-invalid={Boolean(fieldErrors.professionalBody)}
                aria-describedby={fieldErrors.professionalBody ? 'professionalBody-error' : undefined}
                value={professionalBody}
                onChange={(event) => setProfessionalBody(event.target.value)}
                required
              />
              {inlineError('professionalBody')}
            </div>
            <div className="form-group">
              <label htmlFor="professionalQualification">Qualification / grade <span className="req" aria-hidden="true">*</span></label>
              <input
                id="professionalQualification"
                type="text"
                className="form-control"
                minLength={2}
                maxLength={255}
                aria-invalid={Boolean(fieldErrors.professionalQualification)}
                aria-describedby={fieldErrors.professionalQualification ? 'professionalQualification-error' : undefined}
                value={professionalQualification}
                onChange={(event) => setProfessionalQualification(event.target.value)}
                placeholder="Referee grade, assessor or commissioner qualification"
                required
              />
              {inlineError('professionalQualification')}
            </div>
            <div className="form-group">
              <label htmlFor="professionalRegistrationNumber">Registration / license number <span className="hint">(if applicable)</span></label>
              <input
                id="professionalRegistrationNumber"
                type="text"
                className="form-control"
                maxLength={100}
                value={professionalRegistrationNumber}
                onChange={(event) => setProfessionalRegistrationNumber(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="professionalExperience">Recent officiating experience <span className="req" aria-hidden="true">*</span></label>
              <textarea
                id="professionalExperience"
                className="form-control"
                value={professionalExperience}
                onChange={(event) => setProfessionalExperience(event.target.value)}
                minLength={2}
                maxLength={2000}
                aria-invalid={Boolean(fieldErrors.professionalExperience)}
                aria-describedby={fieldErrors.professionalExperience ? 'professionalExperience-error' : undefined}
                rows={4}
                placeholder="List competitions or levels, your role, and the seasons you officiated"
                required
              />
              {inlineError('professionalExperience')}
              <div className="form-hint">Include recent competitions or levels and the seasons you worked. Maximum 2,000 characters.</div>
            </div>
            <div className="form-group">
              <fieldset id="conflictOfInterest" className="workforce-conflict-declaration" aria-describedby="official-conflict-help">
                <legend>Conflict of interest <span className="req" aria-hidden="true">*</span></legend>
                <p id="official-conflict-help" className="form-hint">Do you have a current club affiliation or another relationship that could affect your impartiality for a participating club?</p>
                <div className="workforce-conflict-options">
                  <label>
                    <input
                      type="radio"
                      name="conflictOfInterest"
                      value="no"
                      checked={conflictOfInterest === 'no'}
                      aria-invalid={Boolean(fieldErrors.conflictOfInterest)}
                      aria-describedby={fieldErrors.conflictOfInterest ? 'conflictOfInterest-error' : undefined}
                      onInvalid={() => setFieldErrors((current) => ({ ...current, conflictOfInterest: 'Answer the conflict-of-interest declaration.' }))}
                      onChange={() => {
                        setConflictOfInterest('no');
                        setConflictDetails('');
                      }}
                      required
                    />
                    No
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="conflictOfInterest"
                      value="yes"
                      checked={conflictOfInterest === 'yes'}
                      aria-invalid={Boolean(fieldErrors.conflictOfInterest)}
                      aria-describedby={fieldErrors.conflictOfInterest ? 'conflictOfInterest-error' : undefined}
                      onInvalid={() => setFieldErrors((current) => ({ ...current, conflictOfInterest: 'Answer the conflict-of-interest declaration.' }))}
                      onChange={() => setConflictOfInterest('yes')}
                      required
                    />
                    Yes
                  </label>
                </div>
              </fieldset>
              {inlineError('conflictOfInterest')}
              {conflictOfInterest === 'yes' && (
                <div className="form-group workforce-conflict-details">
                  <label htmlFor="conflictDetails">Please describe the club or relationship <span className="req" aria-hidden="true">*</span></label>
                  <textarea
                    id="conflictDetails"
                    className="form-control"
                    value={conflictDetails}
                    onChange={(event) => setConflictDetails(event.target.value)}
                    minLength={2}
                    maxLength={2000}
                    aria-invalid={Boolean(fieldErrors.conflictDetails)}
                    aria-describedby={fieldErrors.conflictDetails ? 'conflictDetails-error' : undefined}
                    rows={3}
                    required
                  />
                  {inlineError('conflictDetails')}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="officialCredentialFile">Match Official Qualification / Licence Evidence <span className="hint">(optional)</span></label>
              <input
                id="officialCredentialFile"
                type="file"
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                aria-describedby="official-credential-help"
                onChange={handleOfficialCredentialChange}
              />
              <div id="official-credential-help" className="form-hint">Upload a current referee licence, assessor or commissioner certificate, or appointment evidence as a PDF, JPG, JPEG or PNG file (maximum 10 MB). It is stored privately for authorised application reviewers.</div>
            </div>
          </div>
        )}

        {category === 'medical' && (
          <div className="workforce-department-fields">
            <h3 className="form-section-title">Professional qualifications</h3>
            <div className="form-group">
              <label htmlFor="professionalQualification">Qualification / certification <span className="req" aria-hidden="true">*</span></label>
              <input
                id="professionalQualification"
                type="text"
                className="form-control"
                minLength={2}
                maxLength={255}
                aria-invalid={Boolean(fieldErrors.professionalQualification)}
                aria-describedby={fieldErrors.professionalQualification ? 'professionalQualification-error' : undefined}
                value={professionalQualification}
                onChange={(event) => setProfessionalQualification(event.target.value)}
                placeholder="Medical qualification, paramedic or first-aid certification"
                required
              />
              {inlineError('professionalQualification')}
            </div>
            <div className="form-group">
              <label htmlFor="professionalBody">Registration body <span className="hint">(if applicable)</span></label>
              <input
                id="professionalBody"
                type="text"
                className="form-control"
                maxLength={255}
                value={professionalBody}
                onChange={(event) => setProfessionalBody(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="professionalRegistrationNumber">Professional registration / license number <span className="hint">(if applicable)</span></label>
              <input
                id="professionalRegistrationNumber"
                type="text"
                className="form-control"
                maxLength={100}
                value={professionalRegistrationNumber}
                onChange={(event) => setProfessionalRegistrationNumber(event.target.value)}
              />
            </div>
          </div>
        )}

        {category === 'crew' && (
          <div className="workforce-department-fields">
            <h3 className="form-section-title">Crew affiliation and technical details</h3>
            <div className="form-group">
              <label htmlFor="crewWorkArrangement">Work arrangement <span className="req" aria-hidden="true">*</span></label>
              <select
                id="crewWorkArrangement"
                className="form-control"
                value={crewWorkArrangement}
                aria-invalid={Boolean(fieldErrors.crewWorkArrangement)}
                aria-describedby={fieldErrors.crewWorkArrangement ? 'crewWorkArrangement-error' : undefined}
                onInvalid={() => setFieldErrors((current) => ({ ...current, crewWorkArrangement: 'Choose a work arrangement.' }))}
                onChange={(event) => {
                  const arrangement = event.target.value as '' | 'organisation' | 'independent';
                  setCrewWorkArrangement(arrangement);
                  if (arrangement !== 'organisation') {
                    setCrewOrganisation('');
                    setCrewLeadName('');
                    setCrewLeadPhone('');
                  }
                }}
                required
              >
                <option value="">Choose a work arrangement</option>
                <option value="organisation">Working through an organisation / contractor</option>
                <option value="independent">Independent / freelance</option>
              </select>
              {inlineError('crewWorkArrangement')}
            </div>
            {crewWorkArrangement === 'organisation' && (
              <>
                <div className="form-group">
                  <label htmlFor="crewOrganisation">Organisation / crew provider <span className="req" aria-hidden="true">*</span></label>
                  <input
                    id="crewOrganisation"
                    type="text"
                    className="form-control"
                    value={crewOrganisation}
                    onChange={(event) => setCrewOrganisation(event.target.value)}
                    minLength={2}
                    maxLength={255}
                    aria-invalid={Boolean(fieldErrors.crewOrganisation)}
                    aria-describedby={fieldErrors.crewOrganisation ? 'crewOrganisation-error' : undefined}
                    required
                  />
                  {inlineError('crewOrganisation')}
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="crewLeadName">Crew lead / supervisor name <span className="req" aria-hidden="true">*</span></label>
                    <input
                      id="crewLeadName"
                      type="text"
                      className="form-control"
                      value={crewLeadName}
                      onChange={(event) => setCrewLeadName(event.target.value)}
                      minLength={2}
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.crewLeadName)}
                      aria-describedby={fieldErrors.crewLeadName ? 'crewLeadName-error' : undefined}
                      required
                    />
                    {inlineError('crewLeadName')}
                  </div>
                  <div className="form-group">
                    <label htmlFor="crewLeadPhone">Crew lead / supervisor phone <span className="req" aria-hidden="true">*</span></label>
                    <input
                      id="crewLeadPhone"
                      type="tel"
                      className="form-control"
                      value={crewLeadPhone}
                      onChange={(event) => setCrewLeadPhone(normalizePhoneInput(event.target.value))}
                      inputMode="numeric"
                      maxLength={12}
                      pattern="[0-9]{10}"
                      aria-invalid={Boolean(fieldErrors.crewLeadPhone)}
                      aria-describedby={fieldErrors.crewLeadPhone ? 'crewLeadPhone-error' : undefined}
                      required
                    />
                    {inlineError('crewLeadPhone')}
                  </div>
                </div>
                <div className="form-hint">Provide someone NUSC can contact to confirm your crew assignment. Only share their contact details if you are authorised to do so.</div>
              </>
            )}
            <div className="form-group">
              <label htmlFor="technicalSpecialty">Technical specialty <span className="hint">(optional)</span></label>
              <input
                id="technicalSpecialty"
                type="text"
                className="form-control"
                maxLength={255}
                value={technicalSpecialty}
                onChange={(event) => setTechnicalSpecialty(event.target.value)}
                placeholder="For example, console, lighting or LED systems"
              />
            </div>
            <div className="form-group">
              <label htmlFor="experience">Relevant experience <span className="hint">(optional)</span></label>
              <textarea
                id="experience"
                className="form-control workforce-textarea"
                maxLength={2000}
                rows={4}
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
              />
            </div>
          </div>
        )}

        <h2 className="form-section-title">3. Match availability</h2>
        <fieldset className="workforce-availability">
          <legend>Which NUSC home matches can you work? <span className="req" aria-hidden="true">*</span></legend>
          <p className="workforce-availability-help">This helps with scheduling. NUSC administrators assign your match duties and access permissions.</p>
          <div className="workforce-availability-options">
            {([
              ['all', 'All 10 matches'],
              ['selected', 'Selected matches'],
            ] as const).map(([value, label]) => (
              <label key={value} className="workforce-availability-option">
                <input
                  type="radio"
                  name="availabilityMode"
                  value={value}
                  checked={availabilityMode === value}
                  aria-invalid={Boolean(fieldErrors.availabilityMode)}
                  aria-describedby={fieldErrors.availabilityMode ? 'availabilityMode-error' : undefined}
                  onInvalid={() => setFieldErrors((current) => ({ ...current, availabilityMode: 'Choose your match availability.' }))}
                  required
                  disabled={value === 'selected' && (loadingAvailabilityMatches || availabilityMatches.length === 0)}
                  onChange={() => {
                    setAvailabilityMode(value);
                    if (value !== 'selected') setAvailabilityMatchIds([]);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {inlineError('availabilityMode')}
          {inlineError('availabilityMatchIds')}
          {availabilityMode === 'selected' && (
            <div className="workforce-match-list" aria-label="Choose available matches">
              <p className="workforce-availability-help">Select up to 10 matches. {availabilityMatchIds.length} selected.</p>
              {loadingAvailabilityMatches ? (
                <p role="status">Loading match schedule…</p>
              ) : availabilityMatches.length > 0 ? (
                availabilityMatches.map((match) => (
                  <label key={match.id} className="workforce-match-option">
                    <input
                      type="checkbox"
                      value={match.id}
                      checked={availabilityMatchIds.includes(match.id)}
                      disabled={!availabilityMatchIds.includes(match.id) && availabilityMatchIds.length >= 10}
                      onChange={(event) => setAvailabilityMatchIds((current) => event.target.checked
                        ? [...current, match.id]
                        : current.filter((id) => id !== match.id))}
                    />
                    <span>{match.title} <small>{new Date(match.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
                  </label>
                ))
              ) : (
                <p role="status">Specific matches are not configured yet. Choose all 10 matches.</p>
              )}
            </div>
          )}
        </fieldset>

        <h2 className="form-section-title">4. Profile photograph</h2>
        <div className="form-group">
          <div className="photo-upload-container">
            <div className="photo-preview-box">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile photograph preview" />
              ) : (
                <span style={{ fontSize: '30px', color: '#94a3b8' }} aria-hidden="true">◉</span>
              )}
            </div>
            <div className="workforce-photo-copy">
              <input
                ref={photoInputRef}
                id="photo"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="workforce-file-input"
                aria-describedby="photo-help"
                aria-invalid={Boolean(fieldErrors.photo)}
                onChange={handlePhotoChange}
              />
              <div className="workforce-photo-actions">
                <button type="button" className="btn-outline" onClick={() => photoInputRef.current?.click()}>
                  {photoFile ? 'Change photograph' : 'Choose photograph'}
                </button>
                {photoFile && (
                  <button type="button" onClick={handleRemovePhoto} className="btn-outline">Remove</button>
                )}
              </div>
              <div id="photo-help" className="form-hint" style={{ marginTop: '8px' }}>
                JPG, JPEG or PNG only · Maximum 5 MB. Your photograph is stored in private storage for authorised registration and gate staff.
              </div>
            </div>
          </div>
        </div>

        {inlineError('photo')}

        <h2 className="form-section-title">5. Declaration</h2>
        <div className="workforce-declaration">
          <input
            id="declaration"
            type="checkbox"
            checked={declarationAccepted}
            aria-invalid={Boolean(fieldErrors.declaration)}
            aria-describedby={fieldErrors.declaration ? 'declaration-error' : undefined}
            onInvalid={() => setFieldErrors((current) => ({ ...current, declaration: 'Confirm that the information is true and correct.' }))}
            onChange={(event) => setDeclarationAccepted(event.target.checked)}
            required
          />
          <label htmlFor="declaration">
            I confirm that the information submitted is true and correct. I understand that registration is pending verification and that only authorised NUSC administrators can approve applications and issue accreditation. My details and photograph may be used by authorised personnel for workforce administration and matchday identity checks. Press and Media applicants provide an official media ID card or authorisation letter for eligibility review. Match Officials provide professional qualifications, experience and conflict-of-interest information, and may upload credential evidence for review. Crew applicants provide their work arrangement and, when applying through an organisation, a crew lead contact for staffing verification. I confirm I am authorised to share that contact information. See the{' '}
            <Link href="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
          </label>
        </div>
        {inlineError('declaration')}

        <div className="workforce-submit-row">
          <button
            type="submit"
            className="btn-primary workforce-submit-button"
            disabled={isSubmitting || !category || (usesRoleSelection && loadingRoles)}
          >
            {isSubmitting ? 'Submitting registration…' : 'Submit registration'}
          </button>
          <Link href="/" className="btn-outline" style={{ height: '48px' }}>Back to NUSC home</Link>
          <p>Your unique Registration ID will appear after submission. Keep it for future reference.</p>
        </div>
      </form>
            </div>
          </div>

          <aside className="workforce-guide" aria-labelledby="workforce-guide-title">
            <p className="workforce-kicker">Before you begin</p>
            <h2 id="workforce-guide-title">Have these ready</h2>
            <ul>
              <li><span>01</span><p>Your full name, 10-digit mobile number and email address</p></li>
              <li><span>02</span><p>A clear profile photo in JPG, JPEG or PNG format, up to 5 MB</p></li>
              <li><span>03</span><p>Your department and the role you will perform</p></li>
            </ul>
            <div className="workforce-guide-note">
              <strong>After you submit</strong>
              <p>Your registration stays pending until an administrator reviews it. Accreditation type and match access are assigned by NUSC after approval.</p>
            </div>
            <p className="workforce-guide-privacy">Your personal details and photograph are available only to authorised personnel.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
