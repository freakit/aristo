import { ISpeechService } from './BaseSpeechService';
import { OpenAISpeechService } from './OpenAISpeechService';
import { VADOpenAISpeechService } from './VADOpenAISpeechService';
import { DeepgramSpeechService } from './DeepgramSpeechService';
import { VADDeepgramSpeechService } from './VADDeepgramSpeechService';
import { PythonSpeechService } from './PythonSpeechService';
import { VADPythonSpeechService } from './VADPythonSpeechService';

export class SpeechServiceController {
  private static instance: ISpeechService | null = null;

  static createService(): ISpeechService {
    this.resetInstance();
    return this.getInstance();
  }

  static getInstance(): ISpeechService {
    if (!this.instance) {
      const provider = import.meta.env.VITE_STT_PROVIDER || 'python';
      const useVAD = import.meta.env.VITE_USE_VAD === 'true';

      if (provider === 'openai') {
        this.instance = useVAD 
          ? new VADOpenAISpeechService()
          : new OpenAISpeechService();
      } else if (provider === 'deepgram') {
        this.instance = useVAD
          ? new VADDeepgramSpeechService()
          : new DeepgramSpeechService();
      } else if (provider === 'python') {
        this.instance = useVAD
          ? new VADPythonSpeechService()
          : new PythonSpeechService();
      } else {
        throw new Error(`Unknown STT provider: ${provider}`);
      }
    }
    return this.instance;
  }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.disconnect();
    }
    this.instance = null;
  }

  static isVADMode(): boolean {
    return import.meta.env.VITE_USE_VAD === 'true';
  }

  static isButtonMode(): boolean {
    return !this.isVADMode();
  }
}
