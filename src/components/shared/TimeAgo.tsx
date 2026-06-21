'use client';

import React, { useEffect, useState } from 'react';
import { timeAgo } from '../../lib/formatting';

interface TimeAgoProps {
  timestamp: string | Date | number;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ timestamp }) => {
  const [text, setText] = useState<string>(() => timeAgo(timestamp));

  useEffect(() => {
    setText(timeAgo(timestamp));
    const interval = setInterval(() => {
      setText(timeAgo(timestamp));
    }, 5000); // Refresh relative display every 5 seconds

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span className="font-mono text-ww-text-muted text-xs">
      {text}
    </span>
  );
};
