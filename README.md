# Cat Sanctuary Mobile

A mobile app for managing a cat sanctuary built with Expo, React Native, TypeScript, and Firebase Firestore.

## Overview

Cat Sanctuary Mobile helps shelter staff manage daily sanctuary operations from one app, including:

- Shelter dashboard overview
- Cat profile management
- New cat intake flow
- Room-based management screens (Interaction, Puspin, Recovery)
- In-app shelter notifications

## Tech Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Firebase Firestore

## Requirements

- Node.js 18+
- npm 9+
- Expo CLI (optional, `npx expo` works without global install)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run start
```

3. Run on a target platform:

```bash
npm run android
npm run ios
npm run web
```

## Firebase Setup

This project uses Firebase Firestore.

- Android config file path in app config: `./google-services.json`
- Firebase app initialization is in `firebaseConfig.ts`

If you are setting up in a new environment:

1. Create a Firebase project.
2. Register your app.
3. Add your Firebase config in `firebaseConfig.ts`.
4. Place Android services file as `google-services.json` in the project root.

Note:
- `google-services.json` is ignored by Git and should not be committed.

## Project Structure

```text
.
|-- App.tsx
|-- firebaseConfig.ts
|-- index.ts
|-- app.json
|-- Shelter Management/
|   |-- ShelterDashboard.tsx
|   |-- Manage Cats/
|   |   |-- AddNewCatScreen.tsx
|   |   |-- ManageCatsScreen.tsx
|   |-- Shelter Rooms/
|       |-- ShelterRoomsScreen.tsx
|       |-- InteractionRoomScreen.tsx
|       |-- PuspinRoomsScreen.tsx
|       |-- RecoveryRoomScreen.tsx
|-- assets/
|   |-- CSC.png
```

## Scripts

- `npm run start`: Starts Expo dev server
- `npm run android`: Starts app in Android mode
- `npm run ios`: Starts app in iOS mode
- `npm run web`: Starts app in web mode

## License

No license file is currently defined for this repository.
