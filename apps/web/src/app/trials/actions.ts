'use server';

export async function submitRegistration(formData: FormData) {
  try {
    const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3002';

    // 1. Upload Indigenous Certificate
    const certFile = formData.get('indigenousCertificate') as File;
    let certificateId = null;

    if (certFile && certFile.size > 0) {
      const mediaFormData = new FormData();
      mediaFormData.append('file', certFile);
      mediaFormData.append('_payload', JSON.stringify({ alt: formData.get('fullName') + ' Indigenous Certificate' }));

      const mediaRes = await fetch(`${payloadUrl}/api/media`, {
        method: 'POST',
        body: mediaFormData,
      });

      if (!mediaRes.ok) {
        const errorText = await mediaRes.text();
        return { error: 'Failed to upload certificate: ' + errorText };
      }

      const mediaData = await mediaRes.json();
      certificateId = mediaData.doc.id;
    }

    if (!certificateId) {
      return { error: 'Indigenous certificate is required.' };
    }

    // 2. Upload Aadhar Card
    const aadharFile = formData.get('aadharCard') as File;
    let aadharCardId = null;

    if (aadharFile && aadharFile.size > 0) {
      const mediaFormData = new FormData();
      mediaFormData.append('file', aadharFile);
      mediaFormData.append('_payload', JSON.stringify({ alt: formData.get('fullName') + ' Aadhar Card' }));

      const mediaRes = await fetch(`${payloadUrl}/api/media`, {
        method: 'POST',
        body: mediaFormData,
      });

      if (!mediaRes.ok) {
        const errorText = await mediaRes.text();
        return { error: 'Failed to upload Aadhar card: ' + errorText };
      }

      const mediaData = await mediaRes.json();
      aadharCardId = mediaData.doc.id;
    }

    if (!aadharCardId) {
      return { error: 'Aadhar card is required.' };
    }

    // 3. Submit the registration
    const registrationData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      dateOfBirth: formData.get('dateOfBirth'),
      aadharCard: aadharCardId,
      crsNumber: formData.get('crsNumber'),
      indigenousCertificate: certificateId,
    };

    const regRes = await fetch(`${payloadUrl}/api/trial-registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    if (!regRes.ok) {
      const errorText = await regRes.text();
      return { error: 'Failed to submit registration: ' + errorText };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
