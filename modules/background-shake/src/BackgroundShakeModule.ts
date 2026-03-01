import { NativeModule, requireNativeModule } from 'expo';

import { BackgroundShakeModuleEvents } from './BackgroundShake.types';

declare class BackgroundShakeModule extends NativeModule<BackgroundShakeModuleEvents> {
  startService(contacts: string, message: string): void;
  stopService(): void;
  sendSMS(contacts: string, message: string): boolean;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BackgroundShakeModule>('BackgroundShake');
