// utils/avatarHelper.ts

// Generate avatar from email (letter-based avatar)
export const generateEmailLetterAvatar = (email: string, backgroundColor: string = "#4A90E2"): string => {
  try {
    if (!email) return "";
    
    // Get first letter of email
    const letter = email.charAt(0).toUpperCase();
    
    // Create a simple data URL for the avatar
    // This is a placeholder implementation
    // In production, you'd use a canvas or image generation library
    
    return `data:image/svg+xml;utf8,
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="${backgroundColor}"/>
        <text x="100" y="130" font-size="80" font-weight="bold" fill="white" text-anchor="middle">${letter}</text>
      </svg>
    `;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return "";
  }
};

// Generate avatar from name
export const generateNameAvatar = (name: string, backgroundColor: string = "#4A90E2"): string => {
  try {
    if (!name) return "";
    
    // Get first letter of first name and first letter of last name
    const parts = name.trim().split(" ");
    let initials = parts[0]?.charAt(0).toUpperCase() || "";
    if (parts.length > 1) {
      initials += parts[parts.length - 1].charAt(0).toUpperCase();
    }
    
    return `data:image/svg+xml;utf8,
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="${backgroundColor}"/>
        <text x="100" y="130" font-size="70" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
      </svg>
    `;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return "";
  }
};

// Get random background color
export const getRandomAvatarColor = (): string => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default {
  generateEmailLetterAvatar,
  generateNameAvatar,
  getRandomAvatarColor,
};
