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

**Język interfejsu strony docelowej:** angielski (copy w §3.1). Poniżej: struktura + kotwice nawigacji po angielsku.

1. **Nagłówek (sticky, lekki)**  
   Wordmark „Aruru” + linki kotwicowe: **Features**, **Who it’s for**, **Security** + **Log in** + **Get started** (primary).

2. **Hero**  
   - Headline (np. *Software for ceramic studios — calm, organised, together.*)  
   - Jedno zdanie wartości (członkowie, community, operacje pracowni).  
   - **Get started** → `/register` (lub ekran Register w SPA); **Log in** → `/login`.  
   - Opcjonalnie: jedna ilustracja / zdjęcie — bez karuzeli w MVP.

3. **Social proof (opcjonalnie w MVP)**  
   Cytat beta lub neutralna linia typu *Built with studios in Europe* — bez liczb z API, jeśli ich nie ma.

4. **Features**  
   Sekcja kart — **gotowe copy po angielsku w §3.1** (Tasks dopięte pod kontrakt backendu; pozostałe karty krótkie i zgodne z modułami w aplikacji).

5. **Who it’s for**  
   Trzy krótkie bloki: **Studio owners**, **Assistants**, **Members** — prosty język, bez żargonu API.

6. **Security & privacy**  
   Dane izolowane per studio, hosting EU (Frankfurt), linki do Privacy / Terms (URL do uzupełnienia).

7. **Partners (sponsors)**  
   Krótki blok dla marek + CTA do ścieżki sponsora w rejestracji — bez cen na landing, jeśli ceny są tylko w aplikacji.

8. **Footer**  
   ©, legal links, opcjonalnie `mailto:`, opcjonalnie link do status page.

**Nie w MVP:** blog, pełna dokumentacja API, chatbot.

---

## 3.1 Feature copy — English (implementation text)

Wszystkie nagłówki i akapity poniżej są **gotowe do wklejenia** na landing (dostosuj tylko długość linii pod layout). Karty mają ten sam rytm: **tytuł → jedno zdanie lead → 3–5 punktów** (Tasks ma pełniejszy zakres, bo domknięty pod backend).

### Tasks

**Card title:** Tasks & studio time

**Lead:** Keep studio work visible in one place: assign jobs, set deadlines, move tasks through clear stages, and log hours against each task so everyone sees the same history.

**Bullets (visitor-facing):**

- **Clear workflow** — Every task moves through **To do**, **In progress**, **Done**, or **Cancelled**, so the studio shares one simple picture of what’s happening.
- **Priorities & ownership** — Set **low**, **normal**, or **high** priority; optionally assign a member and a **due date** so nothing important slips through the cracks.
- **Fair editing rules** — **Owners** and **assistants** can update or remove any task. **Members** can edit or delete tasks **they created**, keeping day-to-day control with leads where it belongs.
- **Time on the record** — Add **time logs** with hours, a **date** (defaults to today if omitted), and an optional **note**. The whole studio can read the log history for a task—useful for commissions, open studios, or shared workloads.
- **Subscription-aware** — Creating new tasks is available when the studio’s plan is active; if the subscription lapses, the app can prompt people to **renew** instead of failing silently.

**Do not promise on the landing:** clearing a due date or wiping fields via API quirks (backend treats many `null` PATCH fields as “no change”; unassign uses empty assignee, not `null`) — implementers: see internal alignment below.

**Micro-line (optional, under card):** *Tasks and logs are scoped to your studio—only members of that studio can see them.*

---

### Other feature cards (short — align with shipped app)

| Card title | One-line lead |
|------------|----------------|
| **Your studio, your space** | One account, many studios; roles (**owner**, **assistant**, **member**) are per studio, so the same person can work differently in each place. |
| **Community** | Feed, discover studios and artists, forum-style discussions—stay connected beyond the kiln room. |
| **Kiln & firings** | Plan and track firings so members know what’s in the kiln and what’s next. |
| **Materials** | Shop and catalog flows for studio materials—keep ordering and stock in the same ecosystem. |
| **Stay informed** | Notifications so members and staff see what matters without digging through threads. |

*(Skróć lub ukryj karty modułów, których jeszcze nie publikujecie publicznie.)*

---

### 3.2 Tasks ↔ backend (internal verification, not landing copy)

| Marketing claim | Backend / product note |
|-----------------|-------------------------|
| Statuses To do / In progress / Done / Cancelled | `TaskStatus`: `todo`, `in_progress`, `done`, `cancelled`. |
| Priorities | `low` \| `normal` (default) \| `high`. |
| Assignee & due date | Optional; `assigneeUserId` must be valid member id when set; remove assignee with **empty string** on PATCH, not `null`. |
| List & filter | `GET /studios/{tenant_id}/tasks` optional `?status=…`; sorted by `due_at` ascending (nulls: verify on prod). |
| Create task | `POST /studios/{tenant_id}/tasks`; **402** if subscription blocked; **403** if email unverified or not a member. |
| Edit / delete | `PATCH` / `DELETE` …`/tasks/{task_id}`; owner & assistant always; member only if `createdBy` matches current user. |
| Time logs | `GET` / `POST` …`/tasks/{task_id}/logs`; `hours` > 0; `date` `YYYY-MM-DD` or omit (server UTC today); `note` optional. |
| After task delete | Logs may remain in DB with orphaned `taskId`—UI should not assume logs disappear. |
| Tenant context | Prefer `tenant_id` in URL for tasks; auth: `Authorization: Bearer`; membership enforced. |

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

- [ ] Zatwierdzone copy (landing EN wg §3.1) i finalne CTA URL  
- [ ] `og:image` wygenerowany i hostowany (Vercel / CDN)  
- [ ] Polityka prywatności i ewentualnie cookies (jeśli analytics)  
- [ ] `/login` i `/register` działają w SPA na produkcji  
- [ ] Faza B: tylko wybrane endpointy + RODO + rate limit  

---

*Dokument roboczy — sekcja Tasks + Features (§3.1) jest zsynchronizowana z API studia; przed publikacją skróć tabelę „Other feature cards” do modułów faktycznie promowanych.*
