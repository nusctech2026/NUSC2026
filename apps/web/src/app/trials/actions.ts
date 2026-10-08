'use server';

export async function submitRegistration(formData: FormData) {
  try {
    const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3002';

    // 1 & 2. Upload files concurrently
    const certFile = formData.get('indigenousCertificate') as File;
    const aadharFile = formData.get('aadharCard') as File;
    let certificateId = null;
    let aadharCardId = null;

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    if (!certFile || certFile.size === 0) {
      return { error: 'Indigenous certificate is required.' };
    }
    if (certFile.size > MAX_FILE_SIZE) {
      return { error: 'Indigenous certificate must be less than 2MB.' };
    }
    
    if (!aadharFile || aadharFile.size === 0) {
      return { error: 'Aadhar card is required.' };
    }
    if (aadharFile.size > MAX_FILE_SIZE) {
      return { error: 'Aadhar card must be less than 2MB.' };
    }

    const uploadFile = async (file: File, altText: string) => {
      const mediaFormData = new FormData();
      mediaFormData.append('file', file);
      mediaFormData.append('_payload', JSON.stringify({ alt: altText }));

      const res = await fetch(`${payloadUrl}/api/media`, {
        method: 'POST',
        body: mediaFormData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to upload ${altText}: ${errorText}`);
      }

      const data = await res.json();
      return data.doc.id;
    };

    try {
      const [certId, aadharId] = await Promise.all([
        uploadFile(certFile, formData.get('fullName') + ' Indigenous Certificate'),
        uploadFile(aadharFile, formData.get('fullName') + ' Aadhar Card')
      ]);
      certificateId = certId;
      aadharCardId = aadharId;
    } catch (e: any) {
      return { error: e.message };
    }

    // 3. Submit the registration
    const registrationData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      playerPosition: formData.get('playerPosition'),
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
