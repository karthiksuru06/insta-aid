import { requireNativeView } from 'expo';
import * as React from 'react';

import { BackgroundShakeViewProps } from './BackgroundShake.types';

const NativeView: React.ComponentType<BackgroundShakeViewProps> =
  requireNativeView('BackgroundShake');

export default function BackgroundShakeView(props: BackgroundShakeViewProps) {
  return <NativeView {...props} />;
}
