# Aruru — specyfikacja landing page + wymagania backend

Dokument do wdrożenia na `aruru.xyz` (obok aplikacji Expo Web). Cel: jasna propozycja wartości, spokojny UX zgodny z design systemem, SEO; backend tylko tam, gdzie jest uzasadniony.

---

## 1. Cele i odbiorcy

| Cel | Miernik (przykładowy) |
|-----|------------------------|
| Wyjaśnić, czym jest Aruru (SaaS dla pracowni ceramicznych) | Czas na stronie, scroll do CTA |
| Skierować do rejestracji / logowania (istniejące ścieżki w aplikacji) | Kliknięcia „Zarejestruj się” / „Zaloguj” |
| Zbudować zaufanie (multi-tenant, role, bezpieczeństwo danych) | — |
| Opcjonalnie: partnerzy (sponsorzy) — osobna ścieżka do rejestracji z `is_sponsor` | Konwersja na Register |

**Odbiorcy:** właściciele pracowni, osoby zarządzające (owner / assistant), członkowie; drugorzędnie sponsorzy marki.

---

## 2. Design system (z `src/theme/tokens.ts`)

- **Tło:** `cream` / `surface` (`#F7F3ED`, `#FDFAF6`)
- **Tekst główny:** `ink` (`#1E1A16`); drugorzędny: `inkMid`, `inkLight`
- **Akcenty / CTA:** `clay` (`#C4714A`); drugi akcent (np. etykiety „Nowe”): `moss`
- **Obramowania:** subtelne, ok. `0.5px` / `border` z tokenów — spójność z aplikacją
- **Typografia:** nagłówki — DM Serif Display; body — Instrument Sans; liczby / techniczne — DM Mono (oszczędnie)
- **Zasady ND:** przewidywalna nawigacja, wystarczający kontrast, bez agresywnych animacji; focus states widoczne na web

---

## 3. Architektura strony (sekcje, kolejność)

1. **Nagłówek (sticky, lekki)**  
   Logo tekstowe „Aruru” + linki: Funkcje, Dla kogo, Bezpieczeństwo (kotwice) + **Zaloguj** + **Rozpocznij** (primary).

2. **Hero**  
   - Krótki headline (np. *Software for ceramic studios — calm, organised, together.*)  
   - Jedno zdanie pod spodem (wartość: członkowie, rezerwacje, community, wielopracownia).  
   - Dwa przyciski: **Utwórz konto** → `/register` lub nawigacja do ekranu Register w SPA; **Zaloguj** → `/login` lub odpowiednik.  
   - Opcjonalnie: ilustracja lub zdjęcie pracowni (stock lub własne), bez carouselu w MVP.

3. **Social proof (opcjonalnie w MVP)**  
   Jeśli brak liczb z API — cytat od beta usera lub „Built with studios in Europe” (bez fałszywych metryk).

4. **Funkcje (3–5 kart)**  
   Krótkie, konkretne: wielopracownia i role, community / feed, powiadomienia, piece (kiln) / zadania / materiały — zgodnie z tym, co aplikacja realnie oferuje (nie obiecywać modułów, których nie ma).

5. **Dla kogo**  
   Owner / assistant / member — jedna kolumna lub trzy krótkie bloki; język prosty.

6. **Bezpieczeństwo i prywatność**  
   Dane per tenant (`tenant_id`), hosting EU (Frankfurt), link do polityki prywatności / regulaminu (URL statyczny lub zewnętrzny, do uzupełnienia).

7. **Sponsorzy (jeśli produktowy)**  
   Krótki blok: „Dla marek” + CTA do rejestracji ścieżki sponsora (jeśli front to obsługuje przez Register). Bez obietnic cenowych na landing, jeśli ceny są tylko w aplikacji po zatwierdzeniu.

8. **Stopka**  
   ©, linki prawne, e-mail kontaktowy (opcjonalnie `mailto:`), opcjonalnie link do status page.

**Nie w MVP:** blog, pełna dokumentacja API, chatbot.

---

## 4. Nawigacja techniczna (integracja z obecną aplikacją)

- Ścieżki głębokie już używane: `verify-email`, `reset-password`, `payment-success`, `payment-cancelled` — **nie zmieniać** bez synchronizacji z backendem i mailami.
- Propozycja URL (jedna domena):
  - `/` — landing (statyczny HTML **lub** lekki route w SPA — decyzja implementacyjna)
  - `/login`, `/register` — wejście do istniejącego auth flow (wymaga dopięcia `Linking` / `getWebAuthDeepLinkInitialState` jeśli jeszcze nieobsługiwane dla tych ścieżek)

**Wymaganie front (osobne zadanie):** upewnić się, że `/login` i `/register` otwierają odpowiednie ekrany w SPA (jak dla innych deep linków).

---

## 5. SEO i meta

- Jeden **`<title>`** i **meta description** (unikalne, < 160 znaków).
- **Open Graph** + **Twitter Card:** `og:title`, `og:description`, `og:image` (1200×630, brand colors), `og:url` = `https://aruru.xyz/`.
- **Canonical:** `https://aruru.xyz/`.
- **Język strony:** `lang` na `<html>` (np. `en` lub `pl` — jeden primary; drugi język = osobna faza lub `hreflang` jeśli będzie `/pl`).
- **Structured data (JSON-LD):** `SoftwareApplication` lub `Organization` — nazwa Aruru, url, opis (bez fałszywego `aggregateRating` bez recenzji).

---

## 6. Dostępność i wydajność

- Kontrast tekstu vs tła zgodny z WCAG AA tam, gdzie to możliwe.
- Obrazy: `width`/`height` lub aspect-ratio, lazy load poniżej folda.
- Landing jako **statyczny HTML** (preferowane dla LCP/SEO) vs pełny bundle RN Web — decyzja w implementacji; ten dokument zakłada, że **MVP landing może być w pełni statyczny** bez wywołań API.

---

# Wymagania backend (FastAPI)

Podział: **faza A — bez backendu** (zalecany start), **faza B — opcjonalne rozszerzenia**.

## Faza A — brak nowych endpointów

Landing nie musi wołać API. Wszystkie CTA prowadzą do istniejących flow rejestracji/logowania i Stripe return URLs już opisanych w `FOUNDATION.md`.

**Backend:** brak zmian obowiązkowych.

---

## Faza B — opcjonalne (tylko jeśli produkt wymaga)

Każdy punkt poniżej to **osobna decyzja produktowa**; implementować tylko po akceptacji (RODO, rate limit, moderacja).

### B1. Publiczne metryki (np. „X pracowni”)

- **GET** `/public/stats` (lub `/marketing/stats`)  
- **Response (przykład):** `{ "studio_count": 42, "updated_at": "..." }`  
- **Wymagania:**  
  - Odczyt z aggregacji / cache (np. odświeżane co godzinę), nie heavy count na każdy request.  
  - Brak danych osobowych.  
  - Opcjonalnie: `Cache-Control` publiczny, krótki TTL.

### B2. Formularz kontaktowy / zgłoszenie demo

- **POST** `/public/contact` lub `/public/demo-request`  
- **Body:** `email`, `name`, `message`, opcjonalnie `company`; honeypot pole antyspam.  
- **Wymagania:**  
  - Rate limiting per IP + per email (np. 3/dzień).  
  - Walidacja email, max długość pól.  
  - Zapis do kolekcji `contact_submissions` (bez `tenant_id` — to nie jest zasób tenanta) **lub** wysyłka na e-mail przez dostawcę (SendGrid itd.).  
  - Jeśli zapis w DB: polityka retencji i podstawa prawna (RODO).

### B3. Newsletter / waitlist

- **POST** `/public/newsletter`  
- **Body:** `email`, opcjonalnie `locale`  
- **Wymagania:** double opt-in (link w mailu) — wymaga szablonu maili i endpointu potwierdzenia; albo integracja z zewnętrznym narzędziem (wtedy backend tylko proxy lub brak).

### B4. Treści dynamiczne na landing (CMS-light)

- **GET** `/public/landing-config` — JSON z nagłówkami, flagami feature (np. „pokaż sekcję sponsorów”).  
- **Wymagania:** cache, wersjonowanie; edycja tylko dla admina — osobny endpoint **PATCH** chroniony JWT + rola admina, **nie** publiczny.

---

## 7. Bezpieczeństwo wspólne dla fazy B

- Wszystkie endpointy `public/*`: **strict validation**, **rate limits**, logowanie nadużyć (bez PII w logach lub z redakcją).  
- CORS: jeśli landing na tej samej domenie co API — często nie jest potrzebny publiczny CORS dla landing; jeśli domeny się różni — skonfigurować whitelistę.  
- **Nie** zwracać wewnętrznych błędów stack trace na publicznych route’ach.

---

## 8. Checklist przed wdrożeniem

- [ ] Zatwierdzone copy (PL/EN) i finalne CTA URL  
- [ ] `og:image` wygenerowany i hostowany (Vercel / CDN)  
- [ ] Polityka prywatności i ewentualnie cookies (jeśli analytics)  
- [ ] `/login` i `/register` działają w SPA na produkcji  
- [ ] Faza B: tylko wybrane endpointy + RODO + rate limit  

---

*Dokument roboczy — dopasuj sekcję „Funkcje” do aktualnego stanu modułów w aplikacji przed publikacją.*
