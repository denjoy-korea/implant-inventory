import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface UseAnalyzeDemoVideoResult {
  demoVideoUrl: string | null;
  isVideoLoading: boolean;
}

export function useAnalyzeDemoVideo(): UseAnalyzeDemoVideoResult {
  const [demoVideoUrl, setDemoVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  useEffect(() => {
    supabase.storage
      .from('public-assets')
      .list('site', { search: 'analysis-demo.mp4' })
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        const fileInfo = data.find((file) => file.name === 'analysis-demo.mp4');
        if (!fileInfo) return;

        const publicUrl = supabase.storage
          .from('public-assets')
          .getPublicUrl('site/analysis-demo.mp4').data.publicUrl;
        const updatedTime = new Date(fileInfo.updated_at).getTime();
        setDemoVideoUrl(`${publicUrl}?t=${updatedTime}`);
      })
      .catch((err) => {
        console.error('Error fetching demo video:', err);
      })
      .finally(() => {
        setIsVideoLoading(false);
      });
  }, []);

  return { demoVideoUrl, isVideoLoading };
}
