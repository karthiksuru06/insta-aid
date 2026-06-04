# Instaaid

Instaaid is a React Native mobile application designed for personal safety, location sharing, and emergency alerts. It features a robust backend built with Node.js/Express and Firebase for real-time data storage and authentication.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Authentication and Firestore enabled

### Environment Setup
1. Clone the repository.
2. Run `npm install` in the root directory.
3. Create a `.env` file based on `.env.example` and populate it with your Firebase credentials.

### Running Locally
To start the backend server:
```bash
node server.js
```
The server will run on port 5000.

To start the React Native mobile app:
```bash
npx expo start
```
Use the Expo Go app on your physical device, or press `a` to open it in an Android emulator.

## Deployment
This project is configured to be deployed easily on [Render](https://render.com). Simply connect your GitHub repository to Render, and it will automatically build and deploy the backend.

## Security
- The backend API is secured using Firebase JWT Authentication.
- All secrets are managed via `.env` files and are never committed to version control.
- Ensure your Google Maps API keys are restricted in the Google Cloud Console.
