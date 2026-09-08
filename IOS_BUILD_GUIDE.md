# iOS Build Guide & GitHub Actions

Since your local computer runs Windows, you cannot compile iOS apps directly on your PC. However, you can use **GitHub Actions** (running on Apple macOS virtual machines with Xcode) to automatically build the iOS app.

---

## What Was Added

A GitHub Actions workflow has been added at:
```
Mobile/.github/workflows/build-ios.yml
```

When triggered, it will build two artifacts:
1. **`TastyBitesMobile.ipa`**: Packaged for physical iOS devices.
2. **`TastyBitesMobile-Simulator.zip`**: Packaged for testing in the macOS iOS Simulator.

Both will be available to download directly from the **Actions** tab on your GitHub repository (`Dobhal411335/sales-mobile`).

---

## How to Trigger the iOS Build

### Option 1: Manual Trigger (Choose Backend URL on demand)
1. Go to your GitHub repository: `https://github.com/Dobhal411335/sales-mobile`
2. Click on the **Actions** tab at the top.
3. In the left sidebar, click on **Build iOS App**.
4. Click the **Run workflow** dropdown on the right:
   - **Backend API URL**: Enter your live backend URL (e.g. `https://sales.tastybitesrestaurant.com` or your Vercel URL).
   - **Build Configuration**: Choose `Release` (recommended) or `Debug`.
5. Click the green **Run workflow** button.

### Option 2: Automatic Trigger on Git Push
Whenever you push commits to the `main` or `master` branch of `sales-mobile`, the workflow triggers automatically and defaults to `https://sales.tastybitesrestaurant.com`.

---

## How to Download the Artifacts

1. Once the workflow run finishes (usually ~10-15 minutes), click on the completed run in the **Actions** tab.
2. Scroll down to the **Artifacts** section at the bottom.
3. Click on **TastyBites-iOS-Build** to download the zip containing:
   - `TastyBitesMobile.ipa`
   - `TastyBitesMobile-Simulator.zip`

---

## How to Install the .ipa on an iPhone/iPad

Because this `.ipa` is built without an Apple Developer certificate:
- **Free Sideloading (Recommended for internal/store testing):**
  - Use [Sideloadly](https://sideloadly.io/) (Windows & Mac) or [AltStore](https://altstore.io/).
  - Connect your iPhone/iPad with a USB cable.
  - Drag and drop `TastyBitesMobile.ipa` and sign in with your free Apple ID.
  - On your iPhone, go to **Settings > General > VPN & Device Management** and trust your Apple ID.
- **Enterprise / Developer Account:**
  - If you have an Apple Developer Program subscription, you can sign the `.ipa` using your distribution certificate or configure signing secrets in GitHub Actions.
