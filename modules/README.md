# Sveriges Förskolor - Modulär Filstruktur

Detta dokument beskriver den nya modulära filstrukturen för Sveriges Förskolor webbapplikation.

## 📁 Filstruktur

```
modules/
├── 01-core/              # Grundläggande system
│   ├── 01-base.css           # Grundstyling, reset, typografi
│   ├── 02-layout.css         # Layout, containers, responsiv design  
│   └── 03-variables.js       # Konstanter, globala variabler
│
├── 02-search/            # Sökfunktionalitet
│   ├── 01-search.css         # Sökruta, filter, slider styling
│   ├── 02-search.js          # Söklogik, fuzzy search, filter
│   └── 03-autocomplete.js    # Autocomplete funktionalitet
│
├── 03-map/               # Kartfunktioner
│   ├── 01-map.css            # Karta styling, Leaflet anpassningar
│   ├── 02-map.js             # Karta initialisering, markers
│   └── 03-geolocation.js     # GPS, användarposition
│
├── 04-sidebar/           # Sidebar och listor
│   ├── 01-sidebar.css        # Sidebar styling, förskole-kort
│   ├── 02-sidebar.js         # Lista generering, pagination
│   └── 03-school-cards.js    # Individuella förskole-kort logik
│
├── 05-comparison/        # Jämförelsefunktion
│   ├── 01-comparison.css     # Jämförelse modal styling
│   ├── 02-comparison.js      # Jämförelse logik, modal hantering
│   └── 03-comparison-table.js # Tabell generering och logik
│
├── 06-statistics/        # Statistik och analys
│   ├── 01-statistics.css     # Statistik modal styling
│   ├── 02-statistics.js      # Statistik beräkningar
│   └── 03-charts.js          # Chart.js integration
│
├── 07-ui/                # UI komponenter
│   ├── 01-animations.css     # Animationer, transitions
│   ├── 02-modals.css         # Modal styling
│   └── 03-interactions.js    # Micro-interactions, hover
│
└── 08-utils/             # Verktyg och utilities
    ├── 01-cache.js           # Cache managers för API
    ├── 02-logging.js         # Event logging system
    └── 03-performance.js     # Loading, progress, optimering
```

## 🎯 Fördelar med denna struktur

### 1. **Tydlig separation av ansvar**
- Varje modul hanterar endast sin specifika funktionalitet
- Enklare att hitta och ändra kod för specifika delar
- Minskar risken för oväntade sidoeffekter

### 2. **Skalbarhet**
- Enkelt att lägga till nya moduler
- Moduler kan utvecklas oberoende av varandra
- Bättre testbarhet per modul

### 3. **Underhållbarhet**
- Mindre kodfiler som är lättare att förstå
- Tydlig namngivning som förklarar innehåll
- Numrering ger laddningsordning

### 4. **Prestanda**
- Möjlighet att lazy-loada moduler som inte används direkt
- Enklare att optimera specifika delar
- Bättre cachning per modul

## 🔧 Användning

### För att ändra sökfunktionen:
1. **CSS styling**: `modules/02-search/01-search.css`
2. **Söklogik**: `modules/02-search/02-search.js`
3. **Autocomplete**: `modules/02-search/03-autocomplete.js`

### För att ändra kartfunktionen:
1. **Karta styling**: `modules/03-map/01-map.css`
2. **Karta funktionalitet**: `modules/03-map/02-map.js`
3. **GPS funktioner**: `modules/03-map/03-geolocation.js`

### För att ändra förskole-korten:
1. **Kort styling**: `modules/04-sidebar/01-sidebar.css`
2. **Lista hantering**: `modules/04-sidebar/02-sidebar.js`
3. **Kort logik**: `modules/04-sidebar/03-school-cards.js`

## 📝 Implementeringsstatus

**✅ Färdigt:**
- Filstruktur skapad
- CSS moduler extraherade för kärnfunktionalitet
- Grundläggande JavaScript moduler
- Ny modular HTML struktur

**🔄 Pågående:**
- Komplett JavaScript extraktion
- Modul interdependenties
- Error handling per modul

**📋 Att göra:**
- Komplett JavaScript separation
- Lazy loading implementation
- Test suite per modul
- Build system för produktion

## 🚀 Migration

För att migrera från den nuvarande monolitiska strukturen:

1. **Utveckling**: Använd `index-modular.html` för utveckling
2. **Test**: Verifiera att alla funktioner fungerar
3. **Deploy**: Byt ut `index.html` mot `index-modular.html`
4. **Rensa upp**: Ta bort gamla filer efter verifiering

## 💡 Best Practices

1. **En funktion per fil**: Håll filerna fokuserade
2. **Tydliga beroenden**: Dokumentera vilka moduler som behöver laddas först
3. **Konsistent namngivning**: Använd samma mönster överallt
4. **Kommentarer**: Börja varje fil med syfte och användning