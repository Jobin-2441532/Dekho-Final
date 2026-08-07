import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const MOOD_COLORS = {
  calm: "#6B3E26",
  comfort: "#7A4A20",
  productive: "#4A5C3F",
  generous: "#3F5A5A",
  big_ticket: "#3D3535",
  quiet: "#7A6A58",
  weekend: "#6B4A2A"
} as const;

const DEFAULT_CONTENT = {
  calm: {
    headline: "Nothing unusual — just a regular day.",
    subtext: "Groceries was your main spend. Everything within normal range."
  },
  comfort: {
    headline: "Today was a comfort spending day.",
    subtext: "You spent a little more on food than usual. That's okay."
  },
  productive: {
    headline: "A clean, intentional day.",
    subtext: "Only essentials today. Your wallet thanks you."
  },
  generous: {
    headline: "You showed up for someone today.",
    subtext: "A transfer went out — generosity is part of your story too."
  },
  big_ticket: {
    headline: "One big move today. That's okay.",
    subtext: "A larger purchase came through. Everything else stayed steady."
  },
  quiet: {
    headline: "A quiet day for your wallet.",
    subtext: "Barely anything went out today. Rest days matter."
  },
  weekend: {
    headline: "Weekend mode — earned and enjoyed.",
    subtext: "A bit of leisure spending. You've worked for it."
  }
};

type Mood = keyof typeof MOOD_COLORS;

interface ReflectionData {
  mood: Mood;
  headline: string;
  subtext: string;
  top_category?: string;
  today_spend?: number;
  vs_average_percent?: number;
}

interface ReflectionCardProps {
  mood?: Mood;
  headline?: string;
  subtext?: string;
}

export function ReflectionCard({ mood: propMood, headline: propHeadline, subtext: propSubtext }: ReflectionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery<ReflectionData>({
    queryKey: ['home-reflection'],
    queryFn: () => api.get('/api/home/reflection'),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const effectiveMood = propMood || (data && !isError ? data.mood : 'calm');
  const effectiveHeadline = propHeadline || (data && !isError ? data.headline : DEFAULT_CONTENT[effectiveMood].headline);
  const effectiveSubtext = propSubtext || (data && !isError ? data.subtext : DEFAULT_CONTENT[effectiveMood].subtext);
  
  const bgColor = MOOD_COLORS.calm; // Locked to default brown as requested

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, backgroundColor: bgColor }}
      transition={{ 
        opacity: { duration: 0.4, delay: 0.1, ease: "easeOut" },
        y: { duration: 0.4, delay: 0.1, ease: "easeOut" },
        backgroundColor: { duration: 0.6 }
      }}
      style={{
        borderRadius: 'var(--radius-xl, 24px)',
        padding: 'var(--space-6, 24px)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden'
      }}
    >
      <motion.p 
        layout="position"
        style={{ 
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs, 12px)', 
          fontWeight: 600, 
          letterSpacing: '0.1em', 
          color: 'rgba(255,255,255,0.65)', 
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}
      >
        TODAY'S REFLECTION
      </motion.p>
      
      {isLoading && !propHeadline ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ height: '32px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px', width: '85%' }}
          />
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }} 
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            style={{ height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px', width: '70%', marginTop: '4px' }}
          />
        </div>
      ) : (
        <>
          <motion.div 
            layout="position"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{ 
              fontFamily: 'var(--font-headline)',
              fontSize: 'var(--text-2xl, 24px)', 
              fontWeight: 700, 
              lineHeight: 1.25,
              letterSpacing: '-0.01em'
            }}
          >
            {effectiveHeadline}
          </motion.div>
          
          <motion.div 
            layout="position"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            style={{ 
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base, 16px)', 
              lineHeight: 1.5, 
              color: 'rgba(255,255,255,0.75)'
            }}
          >
            {effectiveSubtext}
          </motion.div>
        </>
      )}

      <motion.div layout="position" style={{ marginTop: '4px' }}>
        <motion.button 
          layout="position"
          onClick={() => setExpanded(!expanded)}
          style={{ 
            background: 'rgba(255,255,255,0.15)', 
            border: '1px solid rgba(255,255,255,0.2)', 
            borderRadius: '999px', 
            padding: '8px 16px', 
            color: '#FFFFFF', 
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm, 14px)',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          whileTap={{ scale: 0.98 }}
        >
          {expanded ? 'Hide breakdown' : 'Tap to see why'}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255,255,255,0.15)'
            }}>
              {data && !isError ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm, 14px)', lineHeight: 1.6 }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs, 12px)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Category</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{data.top_category || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs, 12px)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Spend</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>₹{(data.today_spend || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 'var(--text-xs, 12px)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vs Average</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      {data.vs_average_percent !== undefined ? 
                        `${data.vs_average_percent > 0 ? '+' : ''}${data.vs_average_percent}% compared to usual` 
                        : 'Not enough data'}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm, 14px)', color: 'rgba(255,255,255,0.85)' }}>Detailed breakdown unavailable.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
