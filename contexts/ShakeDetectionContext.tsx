import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ShakeDetectionContextType {
    isShakeDetectionOn: boolean;
    setIsShakeDetectionOn: (value: boolean) => void;
    shakeDetectedButDisabled: boolean;
    setShakeDetectedButDisabled: (value: boolean) => void;
    isShakeLocked: boolean;
    setIsShakeLocked: (value: boolean) => void;
}

const ShakeDetectionContext = createContext<ShakeDetectionContextType | undefined>(undefined);

// Global variable to access toggle state outside React components
export let globalShakeDetectionEnabled = false;

export const ShakeDetectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isShakeDetectionOn, setIsShakeDetectionOn] = useState(false);
    const [shakeDetectedButDisabled, setShakeDetectedButDisabled] = useState(false);
    const [isShakeLocked, setIsShakeLocked] = useState(false);

    // Load from AsyncStorage on mount
    useEffect(() => {
        const loadShakeDetection = async () => {
            try {
                const value = await AsyncStorage.getItem("shakeDetectionEnabled");
                if (value !== null) {
                    const isEnabled = value === "true";
                    setIsShakeDetectionOn(isEnabled);
                    globalShakeDetectionEnabled = isEnabled;
                }
            } catch (err) {
                console.warn("Error loading shake detection setting", err);
            }
        };
        loadShakeDetection();
    }, []);

    // Save to AsyncStorage and update global whenever it changes
    useEffect(() => {
        const saveShakeDetection = async () => {
            try {
                await AsyncStorage.setItem("shakeDetectionEnabled", isShakeDetectionOn.toString());
                globalShakeDetectionEnabled = isShakeDetectionOn;
                console.log('[ShakeDetectionContext] Toggle state updated:', isShakeDetectionOn);
            } catch (err) {
                console.warn("Error saving shake detection setting", err);
            }
        };
        saveShakeDetection();
    }, [isShakeDetectionOn]);

    return (
        <ShakeDetectionContext.Provider value={{ isShakeDetectionOn, setIsShakeDetectionOn, shakeDetectedButDisabled, setShakeDetectedButDisabled, isShakeLocked, setIsShakeLocked }}>
            {children}
        </ShakeDetectionContext.Provider>
    );
};

export const useShakeDetection = () => {
    const context = useContext(ShakeDetectionContext);
    if (!context) {
        throw new Error("useShakeDetection must be used within ShakeDetectionProvider");
    }
    return context;
};

// Function to get toggle state from any file
export const getShakeDetectionState = async (): Promise<boolean> => {
    try {
        // Prefer the in-memory global (kept in sync by provider). AsyncStorage fallback if needed.
        if (typeof globalShakeDetectionEnabled === 'boolean') return globalShakeDetectionEnabled;
        const value = await AsyncStorage.getItem("shakeDetectionEnabled");
        return value === "true";
    } catch (err) {
        console.warn("Error reading shake detection state", err);
        return false;
    }
};
