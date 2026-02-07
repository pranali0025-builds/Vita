Vita - The Life Stability Companion 🌿

Vita is an offline-first "Adulting Operating System" designed for fresh professionals. Unlike traditional productivity apps that push you to do more, Vita helps you achieve stability by connecting the dots between your Money, Energy, Time, and Preparedness.

📱 Key Features

1. 💸 Smart Money Tracker

Leak Detection: Identifies silent drains on your wallet (e.g., daily coffee, unused subs).

Recurring Engine: Automatically tracks subscriptions and fixed costs.

Privacy First: No bank linking required; all data stays on-device.

2. ⚡ Daily Load Dashboard

Burnout Prevention: Visualizes your daily "Load" based on task effort.

Energy Management: Balances Work, Personal, and Admin tasks.

Anti-To-Do List: Focuses on realistic capacity, not infinite lists.

3. 📊 AI Intelligence Reports

Life Load Detector: Fuses task volume, deadlines, and money stress into a single "Stress Score".

Smart Savings Planner: Analyzes "Needs vs. Wants" to recommend safe saving targets.

Stability Score: A composite metric (0-100) tracking your overall adulting health.

4. 🗂️ Document Vault

Preparedness Score: Calculates if you have essential life docs (Passport, PAN, etc.).

Secure Storage: Stores images locally within the app sandbox.

Expiry Tracking: Flags documents expiring in <30 days.

5. 🎯 Goals & Direction

Risk Detection: Automatically flags goals that are overdue or unrealistic.

Category Filtering: Tracks Career, Health, and Finance ambitions separately.

🛠️ Technical Stack

Framework: React Native (Expo SDK 50+)

Language: TypeScript (Strict Typing)

Database: SQLite (expo-sqlite) - Local-First Architecture

Visualization: react-native-gifted-charts

Hardware Access: Camera/Gallery (expo-image-picker), File System

AI Model: Heuristic Rule-Based Engine (Deterministic, Privacy-Focused)

🚀 Installation & Setup

Clone the repository:

git clone [https://github.com/yourusername/vita-app.git](https://github.com/yourusername/vita-app.git)
cd vita-app


Install Dependencies:

npm install


Run the App:

npx expo start


Press a for Android Emulator.

Press i for iOS Simulator.

Scan QR code with Expo Go for physical devices.

🎤 Presentation Demo Script (2 Minutes)

Use this script to demonstrate the full capabilities of Vita during your evaluation.

Step 1: The "Fresh" Start

Open the App. Show the empty Dashboard.

Narrative: "Vita starts as a blank canvas. But for this demo, I will simulate a month of user activity instantly."

Step 2: The "Magic" Seed (Data Injection)

Navigate to the Reports tab.

Tap the Gear Icon (⚙️) in the top-right corner.

Confirm "Inject Data".

Narrative: "I have just injected 30 days of expenses, tasks, and goals into the local SQLite database."

Step 3: The Problem (Burnout & Chaos)

Go to Dashboard. Point at the Red Load Bar.

Narrative: "Notice the Red bar. Vita detects I have 3 high-effort tasks today, warning me of overload."

Go to Tracker. Scroll through the expenses.

Narrative: "Here is my financial feed. It works offline and supports category tagging."

Step 4: The Business Model (The Paywall)

Go to Reports. Scroll down to the "Burnout Analysis" card.

Show that it is LOCKED.

Narrative: "Vita uses a Freemium model. Basic tracking is free, but AI insights are Premium."

Action: Tap the lock icon. Click "Subscribe - ₹99/mo".

Wait for the "Processing..." spinner.

Narrative: "We simulate a secure payment transaction..." -> "Success!"

Step 5: The Solution (AI Insights Unlocked)

The screen refreshes. Scroll down.

Show Feature 1: "See? The Burnout detector now explains why I'm stressed: 'Deadline Pressure' and 'High Task Volume'."

Show Feature 2: Switch to Monthly Tab. Show "Money Leak Detector".

Narrative: "The AI found a leak: I'm spending too much on 'Wants' vs 'Needs'."

Step 6: Preparedness

Go to Vault.

Narrative: "Finally, Vita ensures I'm ready for life. My Preparedness Score is low because I'm missing my Resume."

END OF DEMO
