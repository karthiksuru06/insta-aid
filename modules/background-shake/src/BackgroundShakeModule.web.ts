import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './BackgroundShake.types';

type BackgroundShakeModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class BackgroundShakeModule extends NativeModule<BackgroundShakeModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(BackgroundShakeModule, 'BackgroundShakeModule');
