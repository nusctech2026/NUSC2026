import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon = <ShoppingBag size={48} color="var(--line-l)" />,
  title,
  description,
  actionText = "Continue Shopping",
  actionHref = "/search",
  onActionClick
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px',
      background: 'var(--white)',
      border: '1px dashed var(--line-l)',
      borderRadius: '12px',
      minHeight: '300px'
    }}>
      <div style={{
        marginBottom: '24px',
        padding: '24px',
        background: 'var(--paper)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)'
      }}>
        {icon}
      </div>
      
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--navy-900)',
        marginBottom: '12px'
      }}>
        {title}
      </h3>
      
      <p style={{
        color: 'var(--muted)',
        fontSize: '1rem',
        marginBottom: '32px',
        maxWidth: '400px',
        lineHeight: 1.5
      }}>
        {description}
      </p>

      {onActionClick ? (
        <button 
          onClick={onActionClick}
          style={{
            padding: '12px 32px',
            background: 'var(--navy-900)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {actionText}
        </button>
      ) : actionHref ? (
        <Link 
          href={actionHref}
          style={{
            padding: '12px 32px',
            background: 'var(--navy-900)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            display: 'inline-block'
          }}
        >
          {actionText}
        </Link>
      ) : null}
    </div>
  );
}
