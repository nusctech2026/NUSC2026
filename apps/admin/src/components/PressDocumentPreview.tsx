'use client';

import React from 'react';
import { useFormFields } from '@payloadcms/ui';

export const PressDocumentPreview: React.FC = () => {
  const photoUrl = useFormFields(([fields]) => fields.photoUrl?.value as string | undefined);
  const photoFilename = useFormFields(([fields]) => fields.photoFilename?.value as string | undefined);

  const govtIdUrl = useFormFields(([fields]) => fields.govtIdUrl?.value as string | undefined);
  const govtIdFilename = useFormFields(([fields]) => fields.govtIdFilename?.value as string | undefined);

  const mediaIdLetterUrl = useFormFields(([fields]) => fields.mediaIdLetterUrl?.value as string | undefined);
  const mediaIdLetterFilename = useFormFields(([fields]) => fields.mediaIdLetterFilename?.value as string | undefined);

  const hasAnyDoc = photoUrl || photoFilename || govtIdUrl || govtIdFilename || mediaIdLetterUrl || mediaIdLetterFilename;

  if (!hasAnyDoc) {
    return (
      <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '14px' }}>
        No uploaded documents found for this accreditation application.
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 0', padding: '20px', background: 'var(--theme-elevation-50, #f8fafc)', border: '1px solid var(--theme-elevation-150, #e2e8f0)', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--theme-elevation-800, #0f172a)' }}>
        Applicant Document Verifications
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Passport Photo */}
        <div style={{ padding: '16px', background: 'var(--theme-elevation-100, #ffffff)', border: '1px solid var(--theme-elevation-200, #e2e8f0)', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
            Passport Photo
          </div>
          {photoUrl ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <img
                  src={photoUrl}
                  alt="Applicant"
                  style={{ width: '90px', height: '110px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{ display: 'inline-block', fontSize: '12px', color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {photoFilename || 'View / Download Photo'}
              </a>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              File: {photoFilename || 'Not provided'}
            </div>
          )}
        </div>

        {/* Government ID */}
        <div style={{ padding: '16px', background: 'var(--theme-elevation-100, #ffffff)', border: '1px solid var(--theme-elevation-200, #e2e8f0)', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
            Government ID
          </div>
          {govtIdUrl ? (
            <div>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#334155', wordBreak: 'break-all' }}>
                {govtIdFilename || 'Government ID Document'}
              </div>
              <a
                href={govtIdUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#0f172a',
                  color: '#ffffff',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                View / Download ID
              </a>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              File: {govtIdFilename || 'Not provided'}
            </div>
          )}
        </div>

        {/* Media ID / Authorisation Letter */}
        <div style={{ padding: '16px', background: 'var(--theme-elevation-100, #ffffff)', border: '1px solid var(--theme-elevation-200, #e2e8f0)', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
            Media ID / Authorisation Letter
          </div>
          {mediaIdLetterUrl ? (
            <div>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#334155', wordBreak: 'break-all' }}>
                {mediaIdLetterFilename || 'Media Authorisation Letter'}
              </div>
              <a
                href={mediaIdLetterUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#0f172a',
                  color: '#ffffff',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                View / Download Letter
              </a>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              File: {mediaIdLetterFilename || 'Not provided'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
