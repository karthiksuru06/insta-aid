import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarComponentProps {
    email: string;
    size?: number;
    backgroundColor?: string;
    image?: string | null;
}

export const AvatarComponent: React.FC<AvatarComponentProps> = ({
    email,
    size = 50,
    backgroundColor = '#ED4C4C',
    image,
}) => {
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [image]);

    let firstLetter = (email?.trim() || 'U').charAt(0).toUpperCase();
    if (!firstLetter) firstLetter = 'U';

    const styles = StyleSheet.create({
        avatar: {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: backgroundColor,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        letter: {
            fontSize: size * 0.5,
            fontWeight: 'bold',
            color: 'white',
        },
        image: {
            width: '100%',
            height: '100%',
        }
    });

    if (image && !imageError) {
        return (
            <View style={styles.avatar}>
                <Image
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                />
            </View>
        );
    }

    return (
        <View style={styles.avatar}>
            <Text style={styles.letter}>{firstLetter}</Text>
        </View>
    );
};
