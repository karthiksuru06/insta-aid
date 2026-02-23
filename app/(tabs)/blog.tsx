import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

;

const Blog = () => {
  const [searchText, setSearchText] = useState("");

  const [activeTab, setActiveTab] = useState("Intro");

  const blogData = [
    {
      title: "InstaAid – Shake. Alert. Stay Safe.",
      text:
        "Emergencies can happen at any time. In many dangerous situations, making a phone call or sending a message is not possible. A person may be panicked, injured, or unable to speak. InstaAid is designed to help in such moments. InstaAid is a smart emergency alert app that silently sends help when the user cannot communicate.",
      category: "Intro",
    },
    {
      title: "What is InstaAid?",
      text:
        "InstaAid is an Android safety application that allows users to send an SOS alert simply by shaking their phone. With a quick shake gesture, the app automatically sends an emergency message along with the user’s live location to saved contacts.",
      category: "Intro",
    },
    {
      title: "Simply Put",
      list: ["Shake → Alert → Stay Safe"],
      category: "Intro",
    },
    {
      title: "How It Works",
      list: [
        "User adds emergency contacts in the app",
        "In danger, the user shakes the phone three times",
        "The app detects the shake and runs in the background",
        "Current GPS location is fetched",
        "An SOS message with location is sent via SMS (even without internet)",
      ],
      category: "Intro",
    },
    {
      title: "Key Features",
      list: [
        "Shake phone to trigger SOS",
        "Real-time GPS location sharing",
        "SMS alerts work offline",
        "Silent emergency triggering",
        "Runs in background",
        "Easy contact management",
        "One-tap emergency call support",
      ],
      category: "Intro",
    },
    {
      title: "Why InstaAid is Different",
      text:
        "Unlike normal emergency apps, InstaAid does not require opening the app or pressing buttons. It uses phone sensors to detect danger situations and sends alerts instantly. This makes it fast, silent, and reliable.",
      category: "Intro",
    },
    {
      title: "Who Can Use InstaAid?",
      list: [
        "Women",
        "Students",
        "Elderly people",
        "Travelers",
        "Anyone who wants extra safety",
      ],
      category: "Intro",
    },

    /* ---------- Safety Features ---------- */
    {
      title: "InstaAid – Personal Safety App for Your Protection",
      text:
        "In today’s world, personal safety has become a major concern, especially during travel, late hours, or unexpected situations. InstaAid is a smart personal safety application designed to provide quick, silent, and reliable help whenever users feel unsafe. With a combination of emergency alerts, real-time location tracking, and instant communication, InstaAid ensures protection is always within reach.",
      category: "Safety Features",
    },
    {
      title: "All-in-One Safety Dashboard",
      text:
        "InstaAid brings multiple safety tools together in a single, easy-to-use interface. Users can access emergency contacts, safety features, permissions, and support options without confusion, even during stressful moments.",
      category: "Safety Features",
    },
    {
      title: "Silent SOS",
      text:
        "Allows users to send an emergency alert without making any sound. Useful when calling or speaking is not possible.",
      category: "Safety Features",
    },
    {
      title: "Fake Call",
      text:
        "Simulates an incoming phone call to help users escape uncomfortable or threatening situations safely.",
      category: "Safety Features",
    },
    {
      title: "Quick Capture",
      text:
        "Instantly takes photos or videos and shares them with emergency contacts for real-time evidence.",
      category: "Safety Features",
    },
    {
      title: "Location Change Alerts",
      text:
        "Notifies trusted contacts when the user’s location changes unexpectedly.",
      category: "Safety Features",
    },
    {
      title: "App Permissions – Ensuring Full Functionality",
      list: [
        "Location Access – Live GPS tracking",
        "Motion Sensor – Shake detection",
        "SMS Access – Sending SOS alerts",
        "Contacts Access – Notifying emergency contacts",
        "Granting these permissions ensures smooth background operation",
      ],
      category: "Safety Features",
    },
    {
      title: "Discreet & Instant Operation",
      text:
        "All safety features are designed to work instantly and discreetly without drawing attention.",
      category: "Safety Features",
    },

    /* ---------- App Permissions ---------- */

    {
      title: "InstaAid – Live Chat Support for Instant Assistance",
      list: [
        "Live Chat provides real-time support for safety features and app usage",
        "Users can ask questions about emergency features",
        "Get help with app settings",
        "Resolve issues quickly",
        "Instant guidance is provided to users",
        "Reduces confusion and builds user trust",
        "Ensures a smooth user experience",
      ],
      category: "live Chat",
    },
    {
      title: "Common Queries via Live Chat",
      list: [
        "Managing emergency contacts",
        "Enabling Silent SOS",
        "Understanding location alerts",
        "Updating phone numbers",
      ],
      category: "live Chat",
    },
    {
      title: "Why Live Chat Is Important",
      list: [
        "Provides instant guidance",
        "Reduces user confusion",
        "Builds trust and reliability",
        "Ensures quick problem resolution",
      ],
      category: "iive Chat",
    },
    {
      title: "Conclusion",
      list: [
        "InstaAid focuses on quick response and silent safety",
        "User-friendly design ensures ease of use",
        "Reliable support makes InstaAid a powerful personal safety companion",
      ],
      category: "iive Chat",
    },

    /* ---------- Contacts & Support ---------- */

    {
      title: "Contacts Sharing & Emergency Numbers",
      list: [
        "Users can add trusted contacts for safety actions like Silent SOS and Fake Calls",
        "Emergency numbers such as police, ambulance, and disaster management are available in one place",
      ],
      category: "Emergency numbers",
    },
    {
      title: "Contact & Support Options",
      list: [
        "Send support messages",
        "Call support or emergency numbers",
        "Live chat assistance available",
      ],
      category: "Emergency numbers",
    },
    {
      title: "Shake to Alert – Quick Emergency Trigger",
      list: [
        "Users can instantly trigger an emergency alert by shaking the phone",
        "Especially useful during panic or danger situations",
        "Requires minimal interaction from the user",
      ],
      category: "Emergency numbers",
    },
    {
      title: "Emergency Numbers – Quick Access to Help",
      list: [
        "Police Helpline (100)",
        "Fire Department (101)",
        "Ambulance Services (108 / 1070)",
        "Disaster Management Support",
        "Important safety and support websites",
        "Allows instant calling during emergencies",
      ],
      category: "Emergency numbers",
    },
    {
      title: "Fake Calls – Discreet Safety Feature",
      list: [
        "Simulates incoming calls that look like real calls",
        "Police Control Room",
        "Doctor",
        "Family members",
        "School or office contacts",
        "Unknown callers",
      ],
      category: "Emergency numbers",
    },
    {
      title: "Why These Features Matter",
      list: [
        "Helps users escape dangerous situations",
        "Provides instant access to emergency help",
        "Works with minimal user interaction",
        "Ideal for women, students, travelers, and elderly users",
        "Supports silent and discreet safety",
      ],
      category: "Emergency numbers",
    },

    /* ---------- App Screens Overview ---------- */

    {
      title: "Login Screen (Welcome Back)",
      list: [
        "This is the first screen users see when opening the app",
        "Users can log in using their email and password",
        "Login button allows quick access to the app",
        "Forgot Password option is available for recovery",
        "New users can navigate to the Sign Up screen",
        "Ensures secure and easy authentication",
      ],
      category: "App Screens Overview",
    },
    {
      title: "Create Account Screen",
      list: [
        "This screen is for new users who want to register",
        "User enters full name",
        "Email address is required",
        "Phone number is required",
        "Password and confirm password fields",
        "Create Account button completes registration",
        "Google Sign Up option available for faster registration",
      ],
      category: "App Screens Overview",
    },
    {
      title: "Set New Password Screen",
      list: [
        "Appears when user wants to reset or update password",
        "User enters a new password",
        "User confirms the password",
        "Update Password button saves changes",
        "Helps maintain account security and recovery",
      ],
      category: "App Screens Overview",
    },
    {
      title: "Allow Location Access Screen",
      list: [
        "Location access is a crucial part of InstaAid functionality",
        "App requests permission to access user location",
        "Required to send accurate live location during emergencies",
        "Clear explanation is shown for transparency",
        "User taps Allow Location Access to continue",
        "Without location access, emergency alerts would not be effective",
      ],
      category: "App Screens Overview",
    },
    {
      title: "Overall User Experience",
      list: [
        "Clean and minimal user interface",
        "Easy and smooth navigation",
        "Simple and clear form fields",
        "Clear call-to-action buttons",
        "Designed for quick understanding during stress situations",
      ],
      category: "App Screens Overview",
    },

  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>InstaAid</Text>
        <Text style={styles.tagline}>Shake. Alert. Stay Safe.</Text>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search articles..."
        style={styles.search}
        placeholderTextColor="#777"
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);

          if (text.trim().length === 0) return;

          const foundItem = blogData.find((item) =>
            item.title.toLowerCase().includes(text.toLowerCase()) ||
            (item.text && item.text.toLowerCase().includes(text.toLowerCase()))
          );

          if (foundItem) {
            setActiveTab(foundItem.category); // 👈 auto switch tab
          }
        }}
      // 👈 important
      />


      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >{[
        "Intro",
        "live Chat",
        "Safety Features",
        "Emergency numbers",
        "App Screens Overview",
      ].map((tab) => (
        <Text
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={[
            styles.tab,
            activeTab === tab && styles.activeTab,
          ]}
        >
          {tab}
        </Text>
      ))}


      </ScrollView>


      {/* Featured Card */}
      <View style={styles.featuredCard}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            InstaAid – Shake. Alert. Stay Safe.
          </Text>
          <Text style={styles.cardDesc}>
            A smart safety app designed to protect users silently and instantly
            during emergencies.
          </Text>
        </View>
      </View>

      {/* Filtered Content */}
      {/* Filtered Content */}
      {blogData
        .filter((item) => {
          const matchesSearch =
            item.title.toLowerCase().includes(searchText.toLowerCase()) ||
            (item.text &&
              item.text.toLowerCase().includes(searchText.toLowerCase()));

          // 🔹 Search unte → tab ignore
          if (searchText.trim().length > 0) {
            return matchesSearch;
          }

          // 🔹 Normal tab click behavior
          return item.category === activeTab;
        })
        .map((item, index) => (
          <BlogCard
            key={index}
            title={item.title}
            text={item.text}
            list={item.list}
          />
        ))}


      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © InstaAid – Instant Help When It Matters Most
        </Text>
      </View>
    </ScrollView>
  );
};

interface BlogCardProps {
  title: string;
  text?: string;
  list?: string[];
}


/* Reusable Card */
const BlogCard: React.FC<BlogCardProps> = ({ title, text, list }) => (
  <View style={styles.blogCard}>
    <Text style={styles.blogTitle}>{title}</Text>

    {text && <Text style={styles.blogText}>{text}</Text>}

    {list &&
      list.map((item: string, index: number) => (
        <Text key={index} style={styles.blogListItem}>
          • {item}
        </Text>
      ))}
  </View>
);


/* Styles */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF5F5",
    padding: 16,
    paddingTop: 30,
  },
  header: {
    marginTop: 20,
    marginBottom: 21,
    alignItems: "center",
  },

  headerTitle: {
    color: "#E04848",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  tagline: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  search: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0,
    marginBottom: 16,
    fontSize: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  /* 🔹 Tabs Container */
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
  },


  /* 🔹 Individual Tab */
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    color: "#555",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },


  /* 🔹 Active Tab */
  activeTab: {
    backgroundColor: "#E04848",
    color: "#fff",
    fontWeight: "600",
  },


  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },




  cardContent: {
    padding: 16,
  },

  cardTitle: {
    color: "#E04848",
    fontSize: 19,
    fontWeight: "700",
  },

  cardDesc: {
    fontSize: 14,
    marginTop: 6,
    color: "#444",
    lineHeight: 20,
  },


  blogCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },


  blogTitle: {
    color: "#E04848",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },


  blogText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
  },


  blogListItem: {
    fontSize: 14,
    marginTop: 6,
    color: "#444",
    lineHeight: 20,
  },

  footer: {
    marginVertical: 24,
    alignItems: "center",
  },

  footerText: {
    fontSize: 12,
    color: "#888",
  },
  featuredImage: {
    width: "100%",
    height: 260,          // 👈 full image kanipinchadaniki proper height
    backgroundColor: "#FFECEC", // empty space neat ga undadaniki
  },

});

export default Blog;