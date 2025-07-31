# OYHustle Fixed Version Roadmap

A concise Markdown roadmap for the OYHustle fixed codebase, ready for Claude implementation.

## 1. Immediate Next Steps

1. **Job Management**
   - Complete **Create**, **Edit**, and **Delete Job** flows with form validation and Redux persistence.
   - Add confirmation dialogs for deletions.

2. **Client Management**
   - Implement **Add/Edit Client** screens and connect to the `clients` slice.
   - Display client-specific job summaries on the Client Details screen.

3. **Receipt Capture**
   - Integrate `react-native-image-picker` (or Expo’s `ImagePicker`) in `ReceiptPhotoCaptureScreen`.
   - Upload images to cloud storage (Firebase Storage or S3) and save URLs in Redux.

4. **Tools & Notes**
   - Build a reusable checklist component for **Tools & Supplies**.
   - Add a rich-text or Markdown note field for job notes; surface them in Job Details.

5. **Payment Integration**
   - Embed PayPal’s mobile SDK and implement GCash API/WebView flow.
   - Add a **Paid in Cash** toggle and unify all payment methods in a single `PaymentScreen`.

6. **Calendar Sync**
   - Use `react-native-google-api` for Google Calendar integration.
   - Integrate EventKit on iOS for native calendar writes.
   - Display sync-status badges on Job Details.

7. **Testing & CI/CD**
   - Write Jest + React Native Testing Library tests for screens, reducers, and selectors.
   - Configure Detox for end-to-end flows (job creation, photo upload, completion).
   - Set up GitHub Actions for linting, type-checking, tests, and E2E on PRs.

8. **Monitoring & Analytics**
   - Integrate Sentry or Firebase Crashlytics at the app root.
   - Instrument core events (job created, payment success, photo uploaded) with Firebase Analytics or Amplitude.

9. **UI/UX Polish**
   - Extract theme tokens (colors, typography, spacing) into a central `theme/` folder.
   - Migrate styles to Tailwind or styled-components for consistency.
   - Conduct an accessibility audit: labels, touch targets ≥44px, contrast ≥4.5:1.
   - Add micro-interactions (Lottie/Reanimated) on success states.

10. **Beta Release Prep**
    - Use Fastlane to automate Android APK and iOS IPA builds.
    - Upload to TestFlight and Play Console; invite testers.
    - Implement a lightweight onboarding tour for first-time users.

---

## 2. Phased Optimization Roadmap

| Phase             | Goals                                                       | Timeline   |
|-------------------|-------------------------------------------------------------|------------|
| **1. Feature Lock**      | Finalize core flows, tests & CI                           | 2 weeks    |
| **2. Observability**     | Crash reporting, analytics, and CI stability              | 1 week     |
| **3. Performance**       | Profile & optimize heavy screens; add offline support     | 2 weeks    |
| **4. UX Polish**         | Design-system rollout, animations, accessibility audit    | 2 weeks    |
| **5. Beta → Launch**     | Beta feedback cycle; app-store prep; marketing site       | 2 weeks    |

### Phase Details

- **Phase 1: Feature Lock**
  - Achieve ~90% test coverage for reducers and components.
  - Block PRs on lint/type/test failures.

- **Phase 2: Observability**
  - Verify Sentry captures uncaught errors and refine log granularity.
  - Ensure analytics events fire correctly across key flows.

- **Phase 3: Performance**
  - Profile with React DevTools; optimize slow components (e.g., photo capture).
  - Implement `redux-persist` or `async-storage` for offline resume.

- **Phase 4: UX Polish**
  - Migrate to centralized theme tokens; replace hard-coded styles.
  - Add micro-animations and custom navigation transitions.

- **Phase 5: Beta → Launch**
  - Collect NPS and in-app feedback; prioritize top issues.
  - Finalize app-store listings, icons, and privacy policy.

---

*Ready for Claude to take this roadmap and scaffold implementation phases.*

