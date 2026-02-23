import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "./ThemeContext";

interface AppHeaderProps {
    title: string;
    onBack?: () => void;
    right?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title, onBack, right }) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <View style={[styles.headerBg, { backgroundColor: isDark ? "#111" : "#FFF", borderBottomColor: isDark ? "#333" : "#DDD" }]}>
            <View style={styles.headerRow}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={26} color={isDark ? "#FFF" : "#000"} />
                    </TouchableOpacity>
                )}

                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.title, { color: isDark ? "#FFF" : "#000", left: onBack ? 50 : 18 }]}
                >
                    {title}
                </Text>

                <View style={styles.headerRight}>
                    {right}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerBg: {
        height: 95,
        borderBottomWidth: 1.2,
        paddingTop: 26,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 10,
        height: '100%',
    },
    backButton: {
        zIndex: 10,
    },
    title: {
        position: "absolute",
        right: 145,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        lineHeight: 69,
    },
    headerRight: {
        marginLeft: "auto",
        flexDirection: "row",
        alignItems: "center",
    },
});

export default AppHeader;
