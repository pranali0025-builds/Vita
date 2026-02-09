Vita - The Life Stability Companion 🌿

Vita is an offline-first "Adulting Operating System" designed to help fresh professionals transition into independent life. Unlike productivity apps that push you to do more, Vita focuses on Stability—connecting the dots between Money, Energy, Time, and Preparedness.

📱 Key Features

1. 💸 Smart Money Tracker

Leak Detection AI: Identifies silent drains on your wallet (e.g., recurring micro-transactions, unused subscriptions).

Subscription Manager: Dedicated tracking for recurring fixed costs.

Privacy First: No bank linking required; data stays local on SQLite.

2. ⚡ Daily Load Dashboard

Burnout Prevention: Visualizes daily "Cognitive Load" based on task effort (Light/Normal/Heavy).

Energy Check-in: Logs personal energy levels to correlate health with productivity.

Anti-To-Do List: Encourages realistic planning over endless lists.

3. 📊 AI Intelligence Reports

Life Load Detector: Fuses task volume, deadlines, and money stress into a single "Weekly Stress Score".

Smart Savings Planner: Analyzes "Needs vs. Wants" to calculate safe monthly saving targets.

Stability Score: A composite metric (0-100) tracking overall adulting health.

4. 🗂️ Document Vault

Secure Storage: Stores ID cards and documents locally within the app sandbox.

Preparedness Score: Calculates readiness based on essential doc coverage (Passport, PAN, etc.).

Expiry Tracking: Flags documents expiring in <30 days.

5. 🎯 Goals & Direction

Risk Detection: Automatically flags goals that are overdue or have unrealistic timelines.

Category Filtering: Tracks Career, Health, and Finance ambitions separately.

🛠️ Technical Stack

Framework: React Native (Expo SDK 50+)

Language: TypeScript (Strict Typing)

Database: SQLite (expo-sqlite) - Local-First Architecture

Visualization: react-native-gifted-charts

Hardware Access: Camera/Gallery (expo-image-picker), File System

Architecture: Offline-First, No External APIs.

🚀 Installation & Setup

Clone the repository:

git clone [https://github.com/yourusername/vita-app.git](https://github.com/yourusername/vita-app.git)
cd vita-app


Install Dependencies:

npm install


Run Development Server:

npx expo start


Press a to run on Android Emulator.

Scan the QR code with the Expo Go app on a physical device.

📦 Building the APK (Android)

To generate a standalone .apk file that works offline on any Android device:

Install EAS CLI:

npm install -g eas-cli
eas login


Build Production APK:

eas build -p android --profile production


Install: Download the link provided by the terminal and install it on your phone.

🎤 Presentation Demo Script (2 Minutes)

Use this script to demonstrate the full capabilities of Vita during evaluation.

Step 1: The "Fresh" Start

Open App: Show the Login Screen.

Action: Login with any email/password (e.g., user@test.com / password).

View: Show the empty Dashboard.

Narrative: "Vita starts as a blank canvas. But for this demo, I will simulate a month of user activity instantly."

Step 2: The "Magic" Seed (Data Injection)

Navigate to the Reports tab.

Tap the Gear/Construct Icon (top-right).

Confirm "Inject Data".

Narrative: "I have just injected 30 days of expenses, tasks, and goals into the local SQLite database."

Step 3: The Problem (Burnout & Chaos)

Go to Dashboard. Point at the Red Load Bar.

Narrative: "Notice the Red bar. Vita detects I have 3 high-effort tasks today, warning me of burnout risk."

Go to Tracker. Scroll through expenses.

Narrative: "Here is my financial feed. It works completely offline."

Step 4: The Business Model (Paywall)

Go to Reports. Scroll to "Burnout Analysis".

Show that it is LOCKED.

Narrative: "Vita uses a Freemium model. Basic tracking is free, but AI insights are Premium."

Action: Tap the lock icon. Click "Subscribe - ₹99/mo".

Narrative: "We simulate a secure payment transaction..." -> "Success!"

Step 5: The Solution (AI Insights)

The screen unlocks.

Feature 1: Show "Burnout Analysis" -> "Stress Contributors: Deadline Pressure".

Feature 2: Switch to Monthly Tab. Show "Money Leak Detector".

Narrative: "The AI found a leak: I'm spending too much on 'Wants' vs 'Needs'."

Step 6: Preparedness

Go to Vault.

Narrative: "Finally, Vita ensures I'm ready for life. My Preparedness Score is low because I'm missing my Resume."

END OF DEMO
