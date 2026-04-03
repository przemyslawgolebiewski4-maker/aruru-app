# Aruru — Frontend Foundation

## Stack
- React Native Expo ~51 z RN Web (web via Metro + Vercel)
- TypeScript, deploy: **Vercel** (export statyczny do `dist`)
- Stan sesji: **AsyncStorage** — klucz `aruru_access_token` (Bearer do chronionych ścieżek)

## Live URLs
- Frontend: https://aruru.xyz
- Backend (produkcja): https://aruru-backend-production.up.railway.app
- **Stripe return (web linking):** `/payment-success` i `/payment-cancelled` — ekrany `PaymentSuccess` / `PaymentCancelled` w **AuthStack** i **AppStack** (zalogowany użytkownik po checkout); query: `type=studio|sponsor`, `tenant_id` / `tenantId`.

## Konfiguracja API (`EXPO_PUBLIC_API_URL`)
- **Źródło prawdy w runtime:** `process.env.EXPO_PUBLIC_API_URL` (np. zmienna środowiskowa na **Vercel** przy buildzie web).
- **Fallback w kodzie** (`src/services/api.ts`), gdy env nie jest ustawione: `https://aruru-production.up.railway.app` — może być **inną** usługą Railway niż backend produkcyjny; dla spójności z `aruru.xyz` Ustaw na Vercel:
  `EXPO_PUBLIC_API_URL=https://aruru-backend-production.up.railway.app`
- `app.json` → `expo.extra.apiUrl` jest **informacyjne**; bundler web korzysta z env z builda, nie z tego pola automatycznie.
- Plik **`.env.example`** — szablon lokalny; dopasuj URL do środowiska (lokalny tunnel / staging / produkcja).

## Struktura projektu
```
src/
  navigation/
    index.tsx      # RootNavigator, AuthStack, AppStack, deep linki (verify-email, reset-password, payment-*)
    MainTabs.tsx   # Material top tabs (Studio, Community, Notifications, Profile, opcjonalnie Admin)
    types.ts       # AuthStackParamList, AppStackParamList, MainTabParamList
  screens/
    auth/          # LoginScreen, Login2FAScreen, RegisterScreen, VerifyEmailScreen,
                   # ForgotPasswordScreen, ResetPasswordScreen
    onboarding/    # OnboardingScreen
    owner/         # DashboardScreen, KilnFiringScreen
    member/        # MemberDashboardScreen, BookStudioScreen
    assistant/     # AttendanceScreen, AssistantsOverviewScreen
    kiln/          # KilnListScreen, KilnNewSessionScreen, KilnLoadMembersScreen, KilnDetailScreen
    tasks/         # TaskListScreen, TaskDetailScreen
    events/        # EventListScreen, EventDetailScreen
    costs/         # CostListScreen, CostDetailScreen
    materials/     # MaterialsShopScreen, CatalogManageScreen
    members/       # MembersScreen, MemberProfileScreen, InviteMemberScreen
    profile/       # ProfileScreen, EditProfileScreen, AccountSecurityScreen
    payment/       # PaymentSuccessScreen, PaymentCancelledScreen
    studio/        # CreateStudioScreen, SetupPricingScreen, PricingSettingsScreen, StudioSettingsScreen
    notifications/ # NotificationsScreen
    admin/         # AdminScreen, AdminStudiosScreen, AdminSponsorsScreen, AdminForumScreen,
                   # AdminAdminsScreen, AdminPricingScreen, AdminUsersScreen
    community/
      CommunityScreen.tsx
      ArtistProfileScreen.tsx, ForumPostScreen.tsx, StudioPublicProfileScreen.tsx
      tabs/        # EventFeedTab, StudioFinderTab, ArtistsTab, ForumTab, SponsorsTab
  components/
    ui/            # Button, Input, Badge, Avatar, StatCard, SectionLabel, Divider, DateTimeField
    ImageUpload.tsx, AvatarImage.tsx, …
  hooks/
    useAuth.tsx    # AuthProvider, useAuth, useStudio
  services/
    api.ts         # apiFetch, typy AuthUser, endpointy auth/studio/admin, normalizacja /auth/me
  theme/
    tokens.ts      # colors, typography, fontSize, spacing, radius, controlRadius
  utils/
    confirmAction.ts  # confirmDestructive, confirmNeutral, pickTrialExtensionDays, alertMessage
```

## Admin — potwierdzenia (`confirmAction`)
Na web `Alert.alert` z wieloma przyciskami bywa zawodny (callbacki nie odpalają). Ekrany **`src/screens/admin/*`** używają **`src/utils/confirmAction.ts`** zamiast bezpośredniego `Alert.alert`:
- **`confirmDestructive(title, message, confirmLabel)`** → `Promise<boolean>` — usuwanie, suspend, reject itd.
- **`confirmNeutral(title, message, confirmLabel)`** → `Promise<boolean>` — akcje nie-destrukcyjne (np. approve sponsora z wysyłką maila).
- **`pickTrialExtensionDays(studioName)`** → `Promise<number | null>` — wybór 7 / 14 / 30 dni (native: alert z trzema opcjami; web: `prompt`).
- **`alertMessage(title, message)`** — jeden przycisk / błąd po `apiFetch` (web: `window.alert`).

Mapowanie:
- **AdminStudiosScreen** — extend trial: `pickTrialExtensionDays`; suspend: `confirmDestructive`; reactivate: `confirmNeutral`; błąd PATCH: `alertMessage`.
- **AdminForumScreen** — delete post: `confirmDestructive`; błąd: `alertMessage`.
- **AdminUsersScreen** — GDPR delete: `confirmDestructive`; błąd: `alertMessage`.
- **AdminAdminsScreen** — remove admin: `confirmDestructive`; błędy: `alertMessage`.
- **AdminSponsorsScreen** — approve: `confirmNeutral`; reject / suspend: `confirmDestructive`; błędy: `alertMessage`.

## Auth, profil i 2FA (frontend ↔ backend)
- **Bearer:** `Authorization: Bearer <access_token>` dla chronionych żądań (domyślnie w `apiFetch`).
- **Publiczne ścieżki** (bez Bearer): m.in. `POST /auth/login`, `POST /auth/register`, `POST /auth/login/2fa`, `POST /auth/login/2fa/email/send`, `POST /auth/forgot-password`, `POST /auth/reset-password` — w kodzie: `apiFetch(..., { public: true })`.
- **GET /auth/me:** Bearer; **bez** nagłówka `X-Tenant-ID` (jak community). Odpowiedź: `{ user, studios }` — użytkownik normalizowany do camelCase (`normalizeAuthUser`). Wpis studia może zawierać **`subscriptionStatus`**, **`subscriptionTier`**, **`trialEndsAt`** (camelCase lub snake_case w JSON → normalizacja w `getMe` / `normalizeStudios`).
- **Owner dashboard:** przy `subscriptionStatus === 'trial'` i ≤7 dni do końca (lub trial skończony) oraz przy `past_due` — baner z `POST /stripe/studio/checkout` (checkout URL w przeglądarce).
- **PATCH /auth/me:** body w **snake_case** (`name`, `avatar_url`, `bio`, `community_visibility`, …); odpowiedź to pełny publiczny user — po sukcesie **`setUserFull`**, żeby nie gubić `adminRole`, `adminPermissions`, pól `twoFactor*`.
- **Logowanie:** `POST /auth/login` może zwrócić `access_token` albo `two_factor_required` + `pending_token` + `methods` → ekran **Login2FAScreen** (TOTP i/lub kod e-mail).
- **Avatar:** `POST /uploads/avatar` z Bearer; **`tenantId` pusty** przy wywołaniu `apiFetch`, żeby nie wysłać `X-Tenant-ID`.
- **Admin (UI):** zakładka i dostęp do panelu wg **`userHasAdminTabAccess(user)`** — wymaga `adminRole` oraz albo legacy `aruru_admin` bez granularnych uprawnień, albo co najmniej jednego `true` w `adminPermissions`. Menu sekcji admina filtruj po konkretnych flagach (`studios`, `sponsors`, …).
- **2FA (ustawienia):** **AccountSecurityScreen** — `GET /auth/2fa/status`, TOTP (init / verify / disable), e-mail enable/disable, wyłączenie całości z hasłem; włączenie 2FA wymaga **zweryfikowanego e-maila** (backend + komunikat w UI).

## Design System
Kolory (skrót):
- clay `#C4714A`, moss `#4A5E3A`, cream `#F7F3ED`, ink `#1E1A16`, inkLight `#9C8E82`
- surface `#FDFAF6`, border (półprzezroczysty brąz), error `#C0392B`, errorLight `#FDECEA`
- Pełna paleta i stany: `src/theme/tokens.ts`

Typografia: DM Serif Display + Instrument Sans + DM Mono  
Przykładowe klucze: `typography.display`, `typography.body`, `typography.bodyMedium`, `typography.bodySemiBold`, `typography.mono`

## Kluczowe zasady
- **apiFetch(path, options, tenantId)** — opcjonalny `tenantId` → nagłówek `X-Tenant-ID` (tylko gdy nie `public` i tenant niepusty).
- **Community i /auth/me:** wywołania **bez** `tenantId` (lub pusty string przy uploadzie avatara).
- **Nawigacja community → modal Stack:** `navigation.getParent()` względem rodzica z `AppStack`.
- **currentStudio:** dopasowanie po `tenantId`, nie po samym statusie.
- **DateTimeField:** web = natywny HTML `input`, native = RN picker (lazy load).
- **Kwoty:** EUR (€).
- **Copy interfejsu:** język angielski (UI).

## Badge variant
- `'clay' | 'moss' | 'neutral'` (nie używaj `'default'`).

## Zależności UI warte uwagi
- **react-native-qrcode-svg** — QR dla konfiguracji TOTP; przeciąga **text-encoding@0.7.0** (deprecated w npm — ostrzeżenie przy `npm install`, nie blokuje builda).

## Gdzie szukać błędów przy „login nie działa”
- W DevTools **Network** sprawdź **kod HTTP** odpowiedzi z `…/auth/login` (np. **500** = wyjątek po stronie **Railway / backend**, nie frontu).
- Logi aplikacji FastAPI na Railway — traceback przy żądaniu logowania.
