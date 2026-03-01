import * as React from 'react';

import { BackgroundShakeViewProps } from './BackgroundShake.types';

export default function BackgroundShakeView(props: BackgroundShakeViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
