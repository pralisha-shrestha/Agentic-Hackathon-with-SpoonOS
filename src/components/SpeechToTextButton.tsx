import React, { useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { cn } from '../lib/utils';

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm';
}

const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
  onTranscript,
  className,
  size = 'icon',
}) => {
  const { isRecording, transcript, error, startRecording, stopRecording, resetTranscript } = useSpeechToText();

  // Auto-fill transcript when it's updated
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, onTranscript, resetTranscript]);

  const handleClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'outline'}
      size={size === 'icon-sm' ? 'icon' : size}
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-all',
        isRecording && 'animate-pulse',
        size === 'icon-sm' && 'size-8',
        className
      )}
      title={error || (isRecording ? 'Stop recording' : 'Start voice input')}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </Button>
  );
};

export default SpeechToTextButton;

