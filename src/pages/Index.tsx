
import { useSearchParams } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';

const Index = () => {
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-4">Video Player</h1>
          <p className="text-gray-600 mb-4">
            Please provide a video URL using the <code className="bg-gray-200 px-2 py-1 rounded">url</code> parameter.
          </p>
          <p className="text-sm text-gray-500">
            Example: <code className="bg-gray-200 px-2 py-1 rounded">?url=https://example.com/video.m3u8</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <VideoPlayer url={videoUrl} />
      </div>
    </div>
  );
};

export default Index;
