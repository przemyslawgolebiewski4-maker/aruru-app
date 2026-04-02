# Aruru — Frontend Foundation

## Stack
- React Native Expo ~51 z RN Web (web via Expo)
- TypeScript, Vercel deploy
- AsyncStorage key: aruru_access_token

## Live URLs
- Frontend: https://aruru.xyz
- Backend: https://aruru-backend-production.up.railway.app

## Struktura projektu
src/
  navigation/
    index.tsx      # Stack navigator, ekrany
    types.ts       # AppStackParamList, MainTabParamList
  screens/
    auth/          # Login, Register
    owner/         # DashboardScreen, KilnFiringScreen
    member/        # MemberDashboardScreen, BookStudioScreen
    assistant/     # AttendanceScreen, AssistantsOverviewScreen
    kiln/          # KilnListScreen, KilnNewSessionScreen,
                   # KilnLoadMembersScreen, KilnDetailScreen
    tasks/         # TaskListScreen, TaskDetailScreen
    events/        # EventListScreen, EventDetailScreen
    costs/         # CostListScreen, CostDetailScreen
    materials/     # MaterialsShopScreen, CatalogManageScreen
    members/       # MembersScreen, MemberProfileScreen, InviteMemberScreen
    profile/       # EditProfileScreen
    studio/        # StudioSettingsScreen
    community/
      CommunityScreen.tsx
      ArtistProfileScreen.tsx
      ForumPostScreen.tsx
      StudioPublicProfileScreen.tsx
      tabs/        # EventFeedTab, StudioFinderTab, ArtistsTab,
                   # ForumTab, SponsorsTab
    onboarding/    # CreateStudioScreen, SetupPricingScreen
  components/
    ui/            # Button, Input, Badge, Avatar, StatCard,
                   # SectionLabel, Divider, DateTimeField
  hooks/
    useAuth.ts     # AuthProvider, useAuth, useStudio
  services/
    api.ts         # apiFetch helper
  theme/
    tokens.ts      # kolory, typografia, spacing, radius

## Design System
Kolory:
  clay: #C4714A, moss: #4A5E3A, cream: #F7F3ED
  ink: #1E1A16, inkLight: #8A7E72
  clayLight: #F5E8E0, mossLight: #E8EDE4
  surface: #FDFAF6, border: #E0D9D0, error: #C0392B

Typografia: DM Serif Display + Instrument Sans + DM Mono
  tokens: typography.body, typography.mono, typography.bodySemiBold

## Kluczowe zasady
- apiFetch(path, options, tenantId) — tenantId w X-Tenant-ID header
- Community endpoints: apiFetch bez tenantId (lub pusty string)
- Nawigacja community → Stack: użyj navigation.getParent()
- currentStudio: zawsze match po tenantId (nie po statusie)
- DateTimeField: web = HTML input, native = RN picker (lazy-loaded)
- Wszystkie kwoty w EUR (€)
- Interfejs w języku angielskim

## Badge variant
- 'clay' | 'moss' | 'neutral' (nie 'default')
