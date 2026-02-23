// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   SafeAreaView,
//   TouchableOpacity,
//   FlatList,
//   StyleSheet,
//   Dimensions,
// } from "react-native";

// const languages = [
//   { code: "en-us", name: "English", label: "English - US", bg: "#F9E6E1", color: "#F4625A" },
//   { code: "kn", name: "ಕನ್ನಡ", label: "kannada", bg: "#F4F4F4", color: "#616161" },
//   { code: "te", name: "తెలుగు", label: "Telugu", bg: "#E8DCF7", color: "#7B44C0" },
//   { code: "en-uk", name: "ENGLISH", label: "ENGLISH - UK", bg: "#DAF6F6", color: "#4FBDBA" },
//   { code: "hi", name: "हिंदी", label: "Hindi", bg: "#DAF1F9", color: "#349DB8" },
//   { code: "mr", name: "मराठी", label: "Marathi", bg: "#F3E8FC", color: "#A259DF" },
//   { code: "gu", name: "ગુજરાતી", label: "Gujarati", bg: "#E2F7E4", color: "#62C172" },
//   { code: "ta", name: "தமிழ்", label: "Tamil", bg: "#FEF2E0", color: "#F7A441" },
//   { code: "bn", name: "বাংলা", label: "Bangla", bg: "#F3EBE9", color: "#C18F84" },
//   { code: "ml", name: "മലയാളം", label: "Malayalam", bg: "#EEE2FA", color: "#A87CD7" },
// ];

// const { width } = Dimensions.get("window");
// const CARD_WIDTH = width / 2.2;

// export default function SelectLanguageScreen() {
//   const [selected, setSelected] = useState("en-us");

//   const renderItem = ({ item }: { item: typeof languages[0] }) => {
//     const isActive = item.code === selected;
//     return (
//       <TouchableOpacity
//         style={[
//           styles.card,
//           {
//             backgroundColor: item.bg,
//             borderColor: isActive ? "#31B057" : "transparent",
//           },
//         ]}
//         activeOpacity={0.8}
//         onPress={() => setSelected(item.code)}
//       >
//         <Text style={[styles.langText, { color: item.color, fontWeight: isActive ? "bold" : "normal" }]}>{item.name}</Text>
//         <Text style={styles.label}>{item.label}</Text>
//         {isActive && (
//           <View style={styles.checkCircle}>
//             <Text style={styles.checkMark}>✔</Text>
//           </View>
//         )}
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
//       <View style={{ flex: 1, paddingHorizontal: 12 }}>
//         {/* Header */}
//         <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
//           <Text style={styles.header}>Select Your Language</Text>
//         </View>
//         {/* Language Grid */}
//         <FlatList
//           data={languages}
//           numColumns={2}
//           renderItem={renderItem}
//           keyExtractor={(item) => item.code}
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 10, marginTop: 8 }}
//         />
//       </View>
//       {/* Bottom Illustration Placeholder */}
//       <View style={styles.illustrationPlaceholder}>
//         {/* Intentionally left empty as a stylized placeholder */}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 8,
//     marginLeft: 4,
//   },
//   card: {
//     width: CARD_WIDTH,
//     minHeight: 60,
//     marginVertical: 8,
//     marginHorizontal: 6,
//     borderRadius: 10,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderWidth: 2,
//     justifyContent: "center",
//   },
//   langText: {
//     fontSize: 16,
//   },
//   label: {
//     fontSize: 12,
//     color: "#9F9F9F",
//     marginTop: 2,
//   },
//   checkCircle: {
//     position: "absolute",
//     top: 8,
//     right: 10,
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     width: 22,
//     height: 22,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1.5,
//     borderColor: "#31B057",
//     elevation: 3,
//     shadowColor: "#000",
//   },
//   checkMark: {
//     fontSize: 15,
//     color: "#31B057",
//     fontWeight: "700",
//   },
//   illustrationPlaceholder: {
//     width: "95%",
//     alignSelf: "center",
//     height: 110,
//     marginBottom: 10,
//     marginTop: 2,
//     backgroundColor: "#FAE7E2",
//     borderRadius: 22,
//   },
// });
