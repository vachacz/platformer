## Architektura (PoC)

### Cel
- Prosty, autorytatywny serwer 2D z grawitacją i pojedynczym pokojem gry, zgodny z `SPEC.md`.
- Transport: WebSocket. Tick serwera: 20 Hz (co 50 ms). Snapshoty do klientów: co 50 ms.
- Brak autoryzacji (PoC). Dane wymieniane w JSON.

### Technologia i packaging
- Monorepo z `pnpm workspaces`:
  - `client/` (TypeScript + PixiJS, bundling przez Vite)
  - `server/` (Node.js + TypeScript + `ws` na start; opcjonalnie `uWebSockets.js` później)
  - `shared/` (wspólne typy, stałe i walidacje wiadomości przez Zod)
- Uruchamianie/przenośność:
  - Przeglądarka: build Vite (ESM), statyczne assety z `other/game/assets/`
  - Standalone desktop: Tauri (macOS/Windows/Linux) opakowuje build klienta
- Build/dev tooling:
  - Client: Vite dev server (HMR), ESLint + Prettier
  - Server: `tsup`/`esbuild` w trybie watch (+ nodemon), ESLint
  - Wspólne: skrypty `pnpm` do uruchamiania równoległego `client`/`server`

## Przegląd
- Jeden proces serwera utrzymuje jeden świat (jedna mapa, jeden pokój).
- Klienci łączą się przez WebSocket, wysyłają wejścia; serwer symuluje, rozsyła snapshoty.
- Serwer decyduje o wszystkim (pozycje, trafienia, zgony, respawn, reset punktów).

## Komponenty serwera
- Transport (WS): nasłuch połączeń, dekodowanie/enkodowanie JSON, ping/pong.
- Zarządzanie sesją: nadawanie `playerId`, wejście/wyjście, lista graczy.
- Loader mapy: wczytanie pliku mapy (siatka znaków `.` `#` `H`), walidacja granic i drabin.
- Stan świata:
  - Map: `width`, `height`, `tiles[y][x]` (znaki), preindeks kafelków `#` i `H`.
  - Players: pozycja, prędkość, kierunek, HP, fragi, timery (spawn protection, fire cooldown), flagi (na drabinie).
  - Projectiles: pozycja, prędkość (±X), właściciel.
- Pętla gry (20 Hz): przetwarzanie wejść → symulacja → rozstrzygnięcia → snapshot.
- Systemy:
  - InputSystem: kolejkuje wejścia, ogranicza tempo ognia (2/s), sanity-check.
  - MovementSystem: ruch poziomy, grawitacja, ruch po drabinie, wejście/zejście z drabiny, zeskoki i śmierć przy >1 poziomie.
  - CollisionSystem: kolizja z mapą (podłoga `#`), granice mapy (góra/dół/lewo/prawo).
  - ProjectileSystem: ruch pocisków (6 kaf./s), kolizja z `#` i krawędziami mapy (pocisk znika), trafienia graczy (1 dmg, brak friendly-fire w FFA), pociski przenikają `H`.
  - CombatSystem: śmierć, przydział fraga, respawn (losowe poprawne miejsce), 3 s nietykalności (brak obrażeń i brak strzału).
  - ResetScheduler: co 5 minut resetuje HP=100 i fragi=0.
  - SnapshotPublisher: co 50 ms wysyła snapshot stanu do wszystkich klientów.
- RNG: deterministyczny seed opcjonalnie (łatwiejsze testy), używany do respawnu.

### Pipeline ticka (co 50 ms)
1) Odczytaj i zbuforuj wejścia klientów (ostatnie znane na dany tick).
2) Zastosuj wejścia do graczy (ruch L/R, U/D na drabinie, żądanie strzału – z limitem 2/s i poza spawn-protection).
3) Movement + grawitacja + drabiny + kolizje z `#` i granicami.
4) Aktualizuj pociski (ruch, kolizje z `#` i granicami, trafienia graczy; ignoruj `H`).
5) Rozstrzygnij zgony, nalicz fragi, zaplanuj respawny.
6) Wykonaj respawny (losowe poprawne pola), ustaw 3 s nietykalności i blokadę strzału.
7) Co 5 min (lub jeśli czas nadszedł): zresetuj HP i fragi.
8) Zbuduj i wyślij snapshot do wszystkich klientów.

## Model danych (PoC)
- Jednostki pozycji/prędkości: kafelki (float). Układ: (0,0) lewy-górny; X→, Y↓.
- Player
  - `id: string`, `name: string`
  - `pos: {x: number, y: number}`, `vel: {x: number, y: number}`
  - `dir: 'L'|'R'` (ostatni kierunek poziomy)
  - `hp: number (0..100)`, `frags: number`
  - `onLadder: boolean`
  - `spawnProtectionUntilMs: number` (epoch ms)
  - `fireCooldownUntilMs: number` (epoch ms)
- Projectile
  - `id: string`, `ownerId: string`
  - `pos: {x, y}`, `vel: {x, y}` (y=0; x=±6 kaf./s)
- Map
  - `width: number`, `height: number`, `tiles: string[]` (linie tekstu)

## Protokół sieciowy (JSON)
### Klient → Serwer
- `join` { name: string }
- `input` {
  seq: number, ts: number,
  moveLeft?: boolean, moveRight?: boolean,
  moveUp?: boolean, moveDown?: boolean,
  fire?: boolean
}
- `ping` { ts: number }

### Serwer → Klient
- `welcome` {
  playerId: string,
  map: { width: number, height: number, tiles: string[] },
  constants: {
    tickHz: 20, snapshotMs: 50,
    speeds: { move: 4, ladder: 3, projectile: 6 },
    fireRatePerSec: 2, spawnProtectionMs: 3000
  }
}
- `snapshot` {
  serverTick: number,
  players: Array<{ id, x, y, dir, hp, frags, onLadder, spawnProtected: boolean }>,
  projectiles: Array<{ id, x, y }>,
  events?: Array<{ type: 'kill'|'respawn'|'reset', data: any }>
}
- `pong` { ts: number }
- `error` { code: string, message: string }

Uwagi:
- PoC wysyła pełny snapshot. Optymalizacje (delta, kompresja) – później.
- `seq` w `input` pozwala na ewentualną rekonsyliację klienta.

## Klient (PoC)
- Wejścia: wysyła `input` co tick lub przy zmianach, z lokalnym buforem i numeracją `seq`.
- Render: raster kafelków mapy, gracze (1×1), pociski (0.25×0.25), HUD (lista graczy, HP, fragi).
- Interpolacja: przechowuj 2 ostatnie snapshoty i renderuj z interpolacją czasu; brak lokalnej predykcji w PoC.
- Respektuj spawn-protection (nie renderuj obrażeń i blokuj strzał klienta w GUI przez 3 s).

### Assets
- Tiles:
  - Podłoga: `other/game/assets/floor.svg`.
  - Drabiny: `other/game/assets/ladder.svg`, `other/game/assets/ladder-bottom.svg`, `other/game/assets/ladder-top.svg`.
- Gracze (warianty kolorystyczne 1×1 tile):
  - `other/game/assets/player.svg` (zielony),
  - `other/game/assets/player-blue.svg`,
  - `other/game/assets/player-yellow.svg`,
  - `other/game/assets/player-purple.svg`.
- Pocisk: `other/game/assets/projectile.svg`.
- Użycie i szczegóły: `other/game/assets/README.md`.

## Konfiguracja (PoC)
- `tileSizePx`: np. 32 px
- `speeds`: move=4, ladder=3, projectile=6 (kafelki/s)
- `fireRatePerSec`: 2
- `spawnProtectionMs`: 3000
- `tickHz`: 20, `snapshotMs`: 50

## Testy i narzędzia
- Tryb headless serwera z mock-klientami (skrypty obciążeniowe).
- Deterministyczny seed RNG dla powtarzalności scenariuszy.
- Logi metryk: czas ticka, liczba graczy, liczba pocisków.

## Otwarte kierunki (po PoC)
- Delta-snapshoty i/lub kompresja.
- Autoryzacja i tożsamość gracza.
- Predykcja i rekonsyliacja klienta.
- Zewnętrzny format binarny zamiast JSON.

