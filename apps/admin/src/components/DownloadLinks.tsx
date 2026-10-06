'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

const useMediaUrl = (fieldValue: any) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fieldValue) return

    if (typeof fieldValue === 'object' && fieldValue.url) {
      setUrl(fieldValue.url)
    } else if (typeof fieldValue === 'string') {
      // If it's just an ID, fetch the media document to get the URL
      fetch(`/api/media/${fieldValue}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.url) {
            setUrl(data.url)
          }
        })
        .catch(console.error)
    }
  }, [fieldValue])

  return url
}

export const DownloadCertificate = () => {
  const fileValue = useFormFields(([fields]) => fields.indigenousCertificate?.value)
  const url = useMediaUrl(fileValue)

  if (!url) return null

  return (
    <div style={{ marginBottom: '2rem' }}>
      <a 
        href={url} 
        download 
        target="_blank" 
        rel="noreferrer"
        style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}
      >
        Download Indigenous Certificate
      </a>
    </div>
  )
}

export const DownloadAadhar = () => {
  const fileValue = useFormFields(([fields]) => fields.aadharCard?.value)
  const url = useMediaUrl(fileValue)

  if (!url) return null

  return (
    <div style={{ marginBottom: '2rem' }}>
      <a 
        href={url} 
        download 
        target="_blank" 
        rel="noreferrer"
        style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}
      >
        Download Aadhar Card
      </a>
    </div>
  )
}
