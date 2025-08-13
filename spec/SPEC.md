# Gra (PoC)
W pliku `image.png` znajduje się szkic gry. Gra jest 2D, z grawitacją. Tryb rozgrywki: rywalizacja każdy na każdego (FFA). Na potrzeby PoC nie ograniczamy liczby graczy.

## Mapa gry i format pliku
- Świat to siatka kafelków (grid). Każdy wiersz ma stałą wysokość, a każdy kafelek ma stałą szerokość i wysokość (stałe implementacyjne).
- Mapa jest ograniczona od góry, od spodu, z lewej i z prawej — nie można jej opuścić żadną krawędzią.
- Format mapy to plik tekstowy, w którym każdy znak reprezentuje jeden kafelek. Każda linia pliku to jeden wiersz mapy. Współrzędne: (0,0) to lewy górny róg; oś X w prawo, oś Y w dół.

### Słownik kafelków
- `.` — puste pole (powietrze)
- `#` — podłoga/pełny blok (stały, po którym można chodzić; kolizyjny w pionie)
- `H` — drabina (kafelek wspinaczkowy; nie jest kolizyjny)
- `_` — szczyt drabiny (miejsce wejścia na drabinę z poziomu podłogi)
- `U` — drabina wejściowa (podłoga + drabina w górę; ruch poziomy + tylko UP po drabinie)
- `X` — drabina przecinająca (podłoga + drabina w obie strony; ruch poziomy + UP/DOWN po drabinie)

Zasady ruchu (uproszczone):
- `H`: tylko pionowo UP/DOWN, BRAK ruchu poziomego
- `_`: poziomo (wyjście z drabiny) + tylko DOWN po drabinie (szczyt = brak UP)
- `U`: poziomo (jak `#`) + tylko UP po drabinie
- `X`: poziomo (jak `#`) + UP i DOWN po drabinie

Przykładowy plik mapy:

```
........................
....####_###............
....H...H..###_##.......
....##..H.....H.........
........H.....H.........
........X###..H.........
........H.....H.........
.....#_#######X####_....
......H.......H....H....
......H.......H....H....
..#_##U#_##...H....U##..
...H....H.....H.........
..#U####U##..#U##.......
........................
```

## Ruch, grawitacja i kolizje
- Obowiązuje grawitacja: poza systemem drabiny postać spada, jeśli pod nią nie ma podłogi.
- Poruszanie poziome: po kafelkach podłogi `#` i drabinach z podłogą `U`. Model ruchu binární: stała prędkość pozioma, bez inercji.
- System drabiny składa się z:
  - `H` — pionowe segmenty drabiny (wspinaczka w górę/dół) i nie ma ruchu poziomoge
  - `_` — szczyt drabiny (przejście z podłogi na drabinę)
  - `U` — drabina z podłogą (chodzenie poziome + wspinaczka pionowa)
- Zasady wspinaczki:
  - Na `H` tylko ruch pionowy (w górę/dół)
  - Na `_` przejście między podłogą a drabiną
  - Na `U` ruch poziomy jak po podłodze + pionowy jak po drabinie
  - Dla `U`: ruch w dół możliwy tylko gdy pod `U` jest `H`
- Na drabinie grawitacja nie działa.
- Ikona gracza będącego na drabinie jest wycentowana do segmentu
- Gracze przenikają przez siebie — brak kolizji między graczami.
- Zeskok: maksymalnie o jeden poziom w dół; z większej wysokości = śmierć.

Parametry ruchu (PoC):
- Prędkość pozioma: 4 kafelki/sek.
- Prędkość poruszania po drabinie (pionowa): 3 kafelki/sek.

## Cechy graczy i walka
- Każdy gracz ma pasek życia 0–100; start z 100 punktami życia.
- Każdy gracz ma licznik fragów (zabitych przeciwników).
- Broń: proste pociski; strzelanie tylko w lewo lub prawo (brak strzelania w pionie i po skosie).
- Tempo ognia: maksymalnie 2 strzały na sekundę (limit egzekwowany po stronie serwera).
- Prędkość pocisku: 6 kafelków/sek.
- Zasięg/TTL pocisków: brak limitu — pociski nie wygasają czasowo.
- Kolizje pocisków: pociski przechodzą przez drabiny `H`; zatrzymują się na kafelkach podłogi `#` oraz na krawędziach mapy.
- Trafienie pociskiem zabiera 1 punkt życia.
- Zabicie innego gracza dodaje 1 frag strzelcowi.
- Po śmierci gracz natychmiast respawnuje w losowym, poprawnym miejscu mapy (na podłodze; poza drabiną; nie w powietrzu). Po respawnie obowiązuje nietykalność przez 3 sekundy: gracz nie otrzymuje obrażeń i nie może strzelać.

## Start i przebieg gry
- Serwer gry jest aktywny cały czas i co 5 minut resetuje fragi oraz punkty życia wszystkich graczy.
- Gracze, którzy dołączają, natychmiast biorą udział w rozgrywce.

## Sieć i bezpieczeństwo (PoC)
- Transport: WebSocket.
- Autoryzacja/uwierzytelnianie: na razie brak (PoC). Każdy klient może dołączyć jako gość.
- Tick serwera: 20 Hz.
- Snapshoty stanu do klientów: co 50 ms.
- Serwer autorytatywny: logika gry i walidacja wejść po stronie serwera; klient renderuje i wysyła wejścia.

## Interfejs użytkownika
- Oprócz mapy, w lewym górnym rogu wyświetlana jest lista graczy z paskami życia i liczbą fragów.

## Uwagi implementacyjne (PoC)
- Stałe implementacyjne (np. szerokość/wysokość kafelka, prędkości poruszania i wspinaczki, prędkość i zasięg/czas życia pocisków, tick rate serwera/klienta) mogą być skonfigurowane w kodzie lub pliku konfiguracyjnym.

## System koordynatów i kolizji (implementacja)

### Podstawy systemu koordynatów
- **Jednostka**: kafelki (tiles) jako liczby zmiennoprzecinkowe (float)
- **Pochodzenie (0,0)**: lewy górny róg mapy
- **Osie**: X w prawo (→), Y w dół (↓)
- **Pozycja gracza**: `(x, y)` oznacza **środek hitboxa** gracza

### Anatomia gracza (hitbox 1×1)
Gracz ma hitbox o wymiarach 1×1 kafelek z kluczowymi punktami:
- **Środek (center)**: `(player.x, player.y)` — pozycja referencyjna gracza
- **Stopy (feet)**: `(player.x, player.y + 0.5)` — punkt kontroli podłogi
- **Głowa (head)**: `(player.x, player.y - 0.5)` — punkt kontroli sufitu
- **Pod stopami (below feet)**: `(player.x, player.y + 1.0)` — kontrola drabin poniżej

### Mapowanie pozycji na kafelki
```
Przykład: gracz na pozycji (2.5, 3.5)
- Środek gracza: kafelek [3][2] (wiersz 3, kolumna 2)  
- Stopy gracza: kafelek [4][2] (wiersz 4, kolumna 2)
- Głowa gracza: kafelek [3][2] (wiersz 3, kolumna 2)

Konwersja: Math.floor(y) = wiersz, Math.floor(x) = kolumna
```

### Granice mapy i ograniczenia pozycji
- **Minimalne pozycje**: `x ≥ 0.5`, `y ≥ 0.5` (środek gracza nie może wyjść poza mapę)
- **Maksymalne pozycje**: `x ≤ mapWidth - 0.5`, `y ≤ mapHeight - 0.5`
- **Efekt**: gracz nie może wyjść swoim hitboxem poza mapę w żadnym kierunku

### Deteksja stanów gracza (ground/ladder/air)

#### Stan "ground" (na podłodze)
Gracz jest w stanie ground gdy:
1. **Szczyt drabiny**: środek na `_` AND stopy NIE na `H` AND gracz "osiadł" na poziomie kafelka
2. **Podłoga standardowa**: stopy na kafelku podłogi (`#`, `_`, `U`, `X`) AND gracz "osiadł"
3. **"Osiadły"** = `Math.abs(feetY - Math.floor(feetY)) < 0.1`

#### Stan "ladder" (na drabinie)  
Gracz jest w stanie ladder gdy:
1. **Priorytet 1**: środek na czystej drabinie `H` (blokuje ruch poziomy)
2. **Priorytet 2**: środek na `_` ale stopy wciąż na `H` (wspinaczka w toku)
3. **Ogólnie**: którykolwiek punkt gracza (środek/stopy/głowa/pod stopami) dotyka kafelka drabiny

#### Stan "air" (w powietrzu)
Domyślny stan gdy gracz nie spełnia warunków ground ani ladder.

### Ruch poziomy - zasady bezpieczeństwa
1. **Sprawdzenie bieżącej pozycji**: czy gracz może się ruszać z aktualnego miejsca
2. **Sprawdzenie celu**: czy gracz może bezpiecznie wylądować w nowej pozycji  
3. **Offset celu**: ±0.3 kafelka w kierunku ruchu dla sprawdzenia kolizji
4. **Drabiny**: ruch poziomy tylko z kafelków `_`, `U`, `X` (posiadających podłogę)

### Ruch pionowy i grawitacja
- **W powietrzu**: grawitacja 25.0 kafelków/s²
- **Na podłodze/drabinie**: grawitacja wyłączona (vy = 0)
- **Lądowanie**: płynne gdy odległość < 0.1, w przeciwnym razie snap do pozycji
- **Obrażenia**: śmierć gdy wysokość spadku > 1.0 kafelka

### Spawn gracza
- **Algorytm**: losowy kafelek podłogi z pustym kafelkiem powyżej  
- **Pozycja**: `(tileX + 0.5, tileY - 0.5)` — środek gracza na górze kafelka podłogi
- **Fallback**: środek mapy jeśli nie znaleziono poprawnego miejsca

### Przykłady pozycjonowania
```
Mapa:     Pozycje graczy:
..##      Gracz A: (2.5, 0.5) — środek na [0][2], stopy na [1][2] 
..##      Gracz B: (3.5, 1.5) — środek na [1][3], stopy na [2][3]
```

Hitboksy (PoC):
- Gracz: 1×1 kafelek.
- Pocisk: średnica ~0.25 kafelka.

<!-- Brak pytań otwartych na tym etapie PoC -->
