# Contributing to Instaaid

First off, thank you for considering contributing to Instaaid! It's people like you that make Instaaid such a great tool for personal safety.

## Development Workflow

1. **Fork & Clone**: Fork the repository and clone it to your local machine.
2. **Environment Variables**: Create a `.env` file based on `.env.example` so the app can communicate with Firebase and the local backend server.
3. **Install Dependencies**: Run `npm install` in the project root.
4. **Create a Branch**: Create a new branch for your feature or bugfix (`git checkout -b feature/your-feature-name`).
5. **Make Changes**: Develop your feature. Ensure you run the backend (`node server.js`) and mobile app (`npx expo start`) concurrently to test full-stack changes.
6. **Commit**: Write clear, descriptive commit messages.
7. **Push & Pull Request**: Push your branch to GitHub and open a Pull Request against the `main` branch.

## Code Standards
- We use React Native with Expo. Ensure new dependencies are compatible with Expo SDK 54.
- Do not commit any API keys or secrets. Always use `process.env`.
- Consolidate all external database mutations inside the Express backend rather than calling Firebase directly from the client when complex validation is required.

## Reporting Bugs
If you find a security vulnerability, do NOT open an issue. Email the repository maintainers directly. For all other bugs, please use the GitHub Issue tracker.
