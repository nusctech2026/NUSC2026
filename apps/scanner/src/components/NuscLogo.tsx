import Image from 'next/image'

type NuscLogoProps = {
  className: string
  alt?: string
}

export function NuscLogo({ className, alt = '' }: NuscLogoProps) {
  return (
    <Image
      className={className}
      src="/images/nusc-crest.png"
      alt={alt}
      width={180}
      height={166}
      unoptimized
    />
  )
}
