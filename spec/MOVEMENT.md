## Movement Spec (PoC) - Wersja z nowym formatem mapy

Zakres: ruch gracza 1×1 tile w świecie z nowym systemem kafli drabiny. Dokument uzupełnia `SPEC.md`.

### Kafle i pozycja
- Kafle: `.` powietrze, `#` podłoga, `H` drabina, `_` szczyt drabiny, `U` drabina wejściowa, `X` drabina przecinająca
- Pozycja gracza `(x, y)` oznacza środek hitboxa w jednostkach kafelków (float)
- Gracz ma hitbox 1×1 kafelek: środek w `(x, y)`, stopy na `y + 0.5`, góra na `y - 0.5`

### Stałe (PoC; konfigurowalne)
- moveSpeed = 4.0 tile/s (poziom)
- ladderSpeed = 3.0 tile/s (pion na drabinie)
- gravity = 25.0 tile/s²

### Podstawowe zasady ruchu

#### Ruch poziomy
- Możliwy na kaflach: `#` (podłoga), `_` (szczyt drabiny), `U` (drabina wejściowa), `X` (drabina przecinająca)
- Prędkość: stała moveSpeed, brak inercji
- Sterowanie: LEFT/RIGHT ustawiają vx = ±moveSpeed

#### Ruch pionowy - System drabiny
Gracz może być w jednym z trzech stanów pionowego ruchu:

1. **GROUND** - stoi na podłodze (`#`, `_`, `U`, `X`), grawitacja neutralizowana przez podparcie
2. **LADDER** - na drabinie (`H`, `_`, `U`, `X`), grawitacja wyłączona, można iść w górę/dół
3. **AIR** - w powietrzu, grawitacja aktywna (sciąga gracza w dół)

#### Zasady ruchu dla każdego typu kafla

**`H` (drabina)**:
- **Poziomo**: BRAK (tylko wspinaczka pionowa)
- **UP/DOWN**: zawsze możliwe

**`_` (szczyt drabiny)**:
- **Poziomo**: TAK (można wyjść w bok z drabiny)
- **UP**: NIE (to szczyt, nie można iść wyżej)
- **DOWN**: TAK (zejście po drabinie)

**`U` (drabina wejściowa)**:
- **Poziomo**: TAK (jak po podłodze `#`)
- **UP**: TAK (wejście na drabinę)
- **DOWN**: NIE (nie można schodzić w dół)

**`X` (drabina przecinająca)**:
- **Poziomo**: TAK (jak po podłodze `#`)
- **UP**: TAK (wspinaczka w górę)
- **DOWN**: TAK (schodzenie w dół)

### Grawitacja
- **AIR**: grawitacja aktywna, ściąga gracza w dół z przyspieszeniem 25.0 tile/s²
- **GROUND**: grawitacja neutralizowana przez podparcie podłogi, gracz nie spada
- **LADDER**: grawitacja wyłączona, gracz utrzymuje pozycję bez spadania

### Spadanie i obrażenia
- Spadek z wysokości > 1 kafelka = śmierć
- Respawn: losowa pozycja na podłodze z pustym kaflem powyżej
- 3 sekundy nietykalności po respawnie

### Przejścia między stanami
- **GROUND → LADDER**: wejście na kafel `H`, `_`, lub `U`
- **LADDER → GROUND**: zejście na dół do poziomu podłogi
- **LADDER → AIR**: odejście w bok z drabiny
- **AIR → GROUND**: lądowanie na podłodze (z ewentualną śmiercią)
- **AIR → LADDER**: przechwytywa przez drabinę podczas spadania

### Renderowanie gracza
- Ikona gracza na drabinie (`H`, `_`) jest wycentrowana do segmentu drabiny
- Na podłodze (`#`, `U`) gracz renderowany normalnie

### Kolizje
- Gracze przenikają przez siebie
- Pociski zatrzymują się na `#` i `U`, przechodzą przez `H`, `_`, `.`

### Granice mapy
- Pozycja gracza ograniczona do granic mapy minus połowa hitboxa
- Uderzenie w krawędź: zatrzymanie, vx = 0
