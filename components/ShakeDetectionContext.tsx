import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type ShakeContextType = {
	isShakeDetectionOn: boolean;
	setIsShakeDetectionOn: (v: boolean) => void;
};

const ShakeDetectionContext = createContext<ShakeContextType | undefined>(undefined);

export const ShakeDetectionProvider = ({ children }: { children: React.ReactNode }) => {
	const [isShakeDetectionOn, setIsShakeDetectionOnState] = useState<boolean>(false);

	// Load persisted toggle safely
	useEffect(() => {
		(async () => {
			try {
				const v = await AsyncStorage.getItem('shakeDetectionEnabled');
				if (v !== null) setIsShakeDetectionOnState(v === 'true');
			} catch (e) {
				console.warn('[ShakeDetection] Failed to load setting', e);
			}
		})();
	}, []);

	// Persist toggle safely
	useEffect(() => {
		(async () => {
			try {
				await AsyncStorage.setItem('shakeDetectionEnabled', isShakeDetectionOn.toString());
			} catch (e) {
				console.warn('[ShakeDetection] Failed to save setting', e);
			}
		})();
	}, [isShakeDetectionOn]);

	const setIsShakeDetectionOn = (v: boolean) => {
		setIsShakeDetectionOnState(v);
	};

	// Safely attempt to load native module WITHOUT auto-starting to prevent demo crashes
	useEffect(() => {
		if (Platform.OS === 'web') return;

		(async () => {
			try {
				if (isShakeDetectionOn) {
					console.log('[ShakeDetection] Attempting to load native module...');
					
					// CRITICAL: Wrap require in try-catch to prevent startup crashes
					const mod = require('../modules/background-shake');
					const BackgroundShake = mod?.default;
					
					if (BackgroundShake && typeof BackgroundShake.startService === 'function') {
						console.log('[ShakeDetection] Native module loaded successfully. Ready for manual SOS.');
						// Note: We do NOT auto-start the background service here to guarantee app launch stability.
						// Manual SOS flows will handle their own safe invocation.
					} else {
						console.warn('[ShakeDetection] Native module not available. Disabling feature to prevent crash.');
						setIsShakeDetectionOnState(false);
					}
				}
			} catch (error) {
				console.error('[ShakeDetection] CRITICAL: Failed to load shake module. Disabling to prevent crash.', error);
				setIsShakeDetectionOnState(false);
			}
		})();
	}, [isShakeDetectionOn]);

	return (
		<ShakeDetectionContext.Provider value={{ isShakeDetectionOn, setIsShakeDetectionOn }}>
			{children}
		</ShakeDetectionContext.Provider>
	);
};

export const useShakeDetection = () => {
	const ctx = useContext(ShakeDetectionContext);
	if (!ctx) throw new Error('useShakeDetection must be used inside ShakeDetectionProvider');
	return ctx;
};