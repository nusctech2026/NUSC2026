'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ApplicationSuccessClient() {
  const searchParams = useSearchParams();
  const applicationNumber = searchParams.get('num') || 'NUSC-CMP-2026-PENDING';
  const category = searchParams.get('cat') || 'volunteer';
  const fullName = searchParams.get('name') || 'Applicant';

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(applicationNumber);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = applicationNumber;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy application number:', err);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadSlip = () => {
    if (typeof document === 'undefined') return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setDownloading(false);
        return;
      }

      // Helper for rounded rectangles (compatible with all browser engines)
      const roundRect = (
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      };

      // 1. Base Canvas Background & Gradient
      ctx.fillStyle = '#050f24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, '#050f24');
      bgGrad.addColorStop(0.5, '#081936');
      bgGrad.addColorStop(1, '#0c2249');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top Red Stripe Accent
      ctx.fillStyle = '#e31f2b';
      ctx.fillRect(0, 0, canvas.width, 10);

      // 2. Inner Frame Card
      roundRect(ctx, 40, 35, 1120, 650, 18);
      ctx.fillStyle = 'rgba(8, 25, 54, 0.95)';
      ctx.fill();
      ctx.strokeStyle = '#1a3f7a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Header: Club Crest Badge + Title
      roundRect(ctx, 75, 62, 54, 54, 10);
      ctx.fillStyle = '#e31f2b';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NU', 102, 89);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('NAGALAND UNITED SPORTS CLUB', 145, 82);

      ctx.fillStyle = '#e9b949';
      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('OFFICIAL CAMPAIGN & MATCHDAY OPERATIONS', 145, 104);

      // Top-right Season Badge
      roundRect(ctx, 920, 70, 200, 36, 8);
      ctx.fillStyle = 'rgba(233, 185, 73, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#e9b949';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e9b949';
      ctx.font = '800 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('VERIFIED 2026–27', 1020, 88);

      // Horizontal Divider
      ctx.beginPath();
      ctx.moveTo(75, 136);
      ctx.lineTo(1125, 136);
      ctx.strokeStyle = '#123061';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Document Heading
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('APPLICATION ACKNOWLEDGEMENT SLIP', 75, 180);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px system-ui, -apple-system, sans-serif';
      ctx.fillText('Official confirmation that your application has been received and logged in the NUSC database.', 75, 208);

      // 5. Metadata Grid (Applicant Name & Category)
      // Name Box
      roundRect(ctx, 75, 236, 485, 78, 12);
      ctx.fillStyle = '#0c2249';
      ctx.fill();
      ctx.strokeStyle = '#1a3f7a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('APPLICANT NAME', 95, 260);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      const cleanName = fullName.length > 28 ? fullName.substring(0, 26) + '...' : fullName;
      ctx.fillText(cleanName, 95, 292);

      // Category Box
      roundRect(ctx, 580, 236, 545, 78, 12);
      ctx.fillStyle = '#0c2249';
      ctx.fill();
      ctx.strokeStyle = '#1a3f7a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('CAMPAIGN CATEGORY', 600, 260);

      ctx.fillStyle = '#e9b949';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${category.toUpperCase()} OPERATIONS`, 600, 292);

      // 6. Prominent Application Number Box
      roundRect(ctx, 75, 338, 1050, 168, 14);
      ctx.fillStyle = '#050f24';
      ctx.fill();
      ctx.strokeStyle = '#e9b949';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#e9b949';
      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('YOUR OFFICIAL APPLICATION NUMBER', 600, 374);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 40px "Courier New", Courier, monospace';
      ctx.fillText(applicationNumber, 600, 430);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Please retain this number to track application progress and access your digital event pass.', 600, 474);

      // 7. Footer Info
      ctx.textAlign = 'left';
      const todayFormatted = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Issued: ${todayFormatted}  •  Status: Submitted & Pending Review`, 75, 552);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Portal: nagalandunitedsc.com/campaign/status', 75, 580);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText('Official electronic acknowledgement generated by Nagaland United Sports Club.', 75, 646);

      // Convert canvas to image download
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NUSC-Application-${applicationNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloading(false);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate application slip:', err);
      setDownloading(false);
    }
  };

  return (
    <div
      className="form-card"
      style={{
        textAlign: 'center',
        padding: '48px 32px',
        borderTop: '5px solid var(--camp-red)',
      }}
    >
      <div
        className="no-print"
        style={{
          width: '72px',
          height: '72px',
          background: '#dcfce7',
          color: '#15803d',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px',
        }}
      >
        ✓
      </div>

      <div className="campaign-badge no-print" style={{ marginBottom: '12px' }}>
        Registration Successful!
      </div>

      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--camp-navy-950)', marginBottom: '8px' }}>
        Thank You, {fullName}!
      </h1>

      <p style={{ color: 'var(--camp-muted)', fontSize: '1rem', lineHeight: 1.5, marginBottom: '28px' }}>
        Your registration for NUSC IFL 2026–27 has been received and is pending verification.
      </p>

      {/* Prominent Application Number Box & Actions */}
      <div
        className="printable-slip"
        style={{
          background: 'var(--camp-paper)',
          border: '2px dashed var(--camp-navy-600)',
          borderRadius: '12px',
          padding: '24px 20px',
          marginBottom: '32px',
        }}
      >
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--camp-muted)', marginBottom: '6px', fontWeight: 700 }}>
          Your Registration ID
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 'clamp(1.2rem, 3.5vw, 1.65rem)',
            fontWeight: 800,
            color: 'var(--camp-navy-950)',
            letterSpacing: '0.05em',
            overflowWrap: 'anywhere',
            marginBottom: '8px',
          }}
        >
          {applicationNumber}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--camp-muted)', marginBottom: '18px' }}>
          Please keep this ID for future reference. NUSC administrators will review your registration before any accreditation is issued.
        </div>

        {/* Quick Utility Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }} className="no-print">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-outline"
            style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Copy registration ID to clipboard"
          >
            {copied ? '✓ Copied!' : '📋 Copy Number'}
          </button>
          <button
            type="button"
            onClick={handleDownloadSlip}
            disabled={downloading}
            className="btn-primary"
            style={{
              fontSize: '13px',
              padding: '7px 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--camp-navy-950)',
              borderColor: 'var(--camp-navy-950)',
            }}
            title="Download official registration acknowledgement slip as an image"
          >
            {downloaded ? '✓ Slip Downloaded!' : downloading ? 'Generating Slip...' : '📥 Download Official Slip'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-outline"
            style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Print or save as PDF"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Next Steps List */}
      <div style={{ textAlign: 'left', marginBottom: '32px', background: '#f8fafc', padding: '20px', borderRadius: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--camp-navy-950)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Next Steps & Review Timeline:
        </h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--camp-navy-900)', fontSize: '14px', lineHeight: 1.6 }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Department Review:</strong> The operations team reviews your credentials and role preferences.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Status updates:</strong> If you provided an email, use your registration ID and that email to check your status.
          </li>
          <li>
            <strong>Event ID Issuance:</strong> Once approved, your digital Event Pass with a secure QR code will be generated for gate access.
          </li>
        </ol>
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }} className="no-print">
        <Link href={`/campaign/status?num=${encodeURIComponent(applicationNumber)}`} className="btn-primary">
          Track Application Status
        </Link>
        <Link href="/registrations" className="btn-outline">
          Back to Campaign Hub
        </Link>
      </div>
    </div>
  );
}
