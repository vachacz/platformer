## Plan implementacji (PoC)

Zakres i założenia: zgodnie z `SPEC.md` i `ARCH.md` (serwer autorytatywny 20 Hz, snapshoty co 50 ms, WebSocket, brak autoryzacji, strzały L/R, pociski bez TTL, kolizje z `#` i krawędziami mapy, drabiny `H`, prędkości: move 4, ladder 3, projectile 6, spawn-protection 3 s).

### Faza 0 — Inicjalizacja projektu
- Ustalenie stacku (np. TypeScript/Node dla serwera i klienta web) i narzędzi (lint, formatter, test runner).
- Szkielet repo: `server/`, `client/`, `shared/`, `spec/` (bez implementacji feature’ów).
- Wspólne stałe i typy (`shared/constants.ts|json`, `shared/types.ts`).
- Definicje komunikatów JSON (zgodne z `ARCH.md`).
- DoD: uruchamia się pusty serwer WS i łączy się prosty klient.

### Faza 1 — Loader mapy i reprezentacja świata
- Parser pliku mapy (siatka znaków), walidacja granic i reguł drabin.
- Struktury: `MapState`, `PlayerState`, `ProjectileState`.
- Losowy wybór poprawnych pól do respawnu (na `#`, z powietrzem nad, nie `H`).
- Klientowy resolver wariantów kafelków do renderu (na podstawie sąsiadów):
  - `#` z `H` bezpośrednio pod spodem → renderuj `ladder-top.svg` (wyjście z drabiny na podłogę).
  - `H` z `#` bezpośrednio pod spodem → renderuj `ladder-bottom.svg` (start drabiny z podłogi).
  - `H` w pozostałych przypadkach → renderuj `ladder.svg` (środek drabiny).
  - `#` bez `H` pod spodem → renderuj `floor.svg`.
- DoD: test jednostkowy mapy; wczytana mapa dostępna w stanie serwera; resolver wariantów zwraca poprawne assety dla przykładowej mapy.

### Faza 2 — Pętla gry (tick 20 Hz) i ruch
- Kolejkowanie wejść, najprostszy model ruchu (binarny), grawitacja.
- Wspinanie po drabinie, wejście/zejście, brak kolizji gracz–gracz.
- Zeskok i śmierć przy >1 poziomie.
- DoD: ruch po mapie zgodnie z regułami; snapshot zawiera pozycje graczy.

### Faza 3 — Pociski i walka
- Ograniczenie ognia 2/s (cooldown), blokada w spawn-protection.
- Ruch pocisków (6 kaf./s), kierunki L/R, kolizje z `#` i krawędziami, przenikanie `H`.
- Trafienia: 1 dmg, śmierć przy 0 HP, przypisanie fraga.
- DoD: testy kolizji pocisku z mapą i graczem; snapshot zawiera pociski.

### Faza 4 — Respawn i reset meczu
- Respawn natychmiastowy na losowym poprawnym polu; 3 s nietykalności i blokada strzału.
- Reset globalny co 5 min: HP=100, fragi=0.
- DoD: testy jednostkowe respawnu i resetu; zdarzenia w snapshotach.

### Faza 5 — Sieć i snapshoty
- Protokół WS: `welcome`, `input`, `snapshot`, `ping/pong`, `error`.
- Wysyłka snapshotów co 50 ms; podstawowa kompresja opcjonalnie później.
- DoD: wielu klientów otrzymuje spójne snapshoty; brak błędów dekodowania.

### Faza 6 — Klient (PoC)
- Wejścia (klawiatura): L/R/Up/Down/Fire; wysyłka `input` z `seq`.
- Integracja assetów SVG: preloading `floor.svg`, `ladder.svg`, `ladder-bottom.svg`, `ladder-top.svg`, wariantów `player-*.svg`, `projectile.svg`.
- Render mapy: raster kafelków z użyciem resolvera wariantów; skala zgodna z `tileSizePx` (np. 32 px).
- Render graczy (1×1) z wariantami kolorystycznymi; render pocisków (0.25×0.25); HUD (lista, HP, fragi).
- Interpolacja na podstawie 2 ostatnich snapshotów (bez predykcji).
- DoD: mapa renderuje podłogi i wszystkie warianty drabin zgodnie ze `SPEC.md`; gracze i pociski widoczne; ręczna weryfikacja grywalności lokalnie; stabilne FPS i RTT.

### Faza 7 — Telemetria i stabilność
- Logi serwera: czas ticka, liczba graczy/pocisków, błędy.
- Prosty tryb headless testowy (boty poruszające się i strzelające).
- DoD: test obciążeniowy z kilkoma botami; brak crashy przez 10 min.

### Faza 8 — Polish i cleanup
- Konfiguracja przez plik (prędkości, tick, ścieżka mapy).
- Obsługa reconnect (opcjonalnie): ponowne dołączenie z nowym `playerId`.
- Porządki w kodzie, komentarze, krótkie README uruchomieniowe.
- DoD: repo gotowe do demonstracji PoC.

---

## Checklist akceptacyjny PoC
- Ruch i grawitacja zgodne z `SPEC.md` (w tym drabiny i zeskoki).
- Walka: 2 strzały/s, L/R, kolizja z `#` i krawędziami, 1 dmg, fragi.
- Respawn: losowy, poprawny, 3 s nietykalności i blokada strzału.
- Reset co 5 min: HP i fragi.
- Snapshoty co 50 ms; jednolity stan u klientów.
- HUD: lista graczy, HP, fragi.
- Rendering assetów: `floor.svg`, `ladder.svg`, `ladder-bottom.svg`, `ladder-top.svg` wg reguł sąsiedztwa; warianty kolorów graczy oraz pociski.

## Testy (przykłady)
- Jednostkowe: parser mapy, wejście/wyjście drabiny, limit ognia, kolizje pocisków, respawn i spawn-protection.
- Integracyjne: 2–4 klientów, strzelanie i zgony, reset 5 min.
- Obciążeniowe: 10+ botów przez ≥10 min, bez crashy; czas ticka < 50 ms p95.

## Ryzyka i mitigacje
- Brak TTL pocisków: ryzyko dużej liczby obiektów przy długich korytarzach → limit maks. aktywnych pocisków na gracza/serwer (guard).
- Jitter sieci: prosta interpolacja; ewentualnie buforowanie + opóźnienie renderu (np. 100 ms).
- Kolizje kafelkowe: testy regresyjne przy zmianie mapy.

## Poza zakresem PoC (możliwe rozszerzenia)
- Autoryzacja/konta, czat, moderacja.
- Predykcja i rekonsyliacja klienta, delta-snapshoty, binarny protokół.
- Matchmaking, wiele pokoi, edytor map.

