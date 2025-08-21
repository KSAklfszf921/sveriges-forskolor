# Sveriges Förskolor 🏫

En interaktiv webbapplikation för att utforska och analysera förskolor i Sverige.

## 📋 Funktioner

- **🗺️ Interaktiv karta** - Visa alla förskolor på en interaktiv karta med klusterhantering
- **🔍 Sök och filtrera** - Sök på namn, kommun eller adress med autocomplete
- **📊 Statistik** - Detaljerad statistik och analys i en lightbox-modal
- **⚖️ Jämföra** - Jämför upp till 5 förskolor sida vid sida
- **📍 GPS-lokalisering** - Hitta förskolor nära din position
- **📱 Responsiv design** - Fungerar på alla enheter

## 🚀 Kom igång

1. Klona repositoriet:
```bash
git clone https://github.com/[ditt-användarnamn]/sveriges-forskolor.git
cd sveriges-forskolor
```

2. Öppna `index.html` i din webbläsare eller starta en lokal server:
```bash
# Med Python
python -m http.server 8000

# Med Node.js
npx serve .
```

3. Navigera till `http://localhost:8000` i din webbläsare

## 📁 Projektstruktur

```
sveriges-forskolor/
├── index.html          # Huvudsida med karta och sökfunktioner
├── jamfor.html         # Jämförelsesida (separerad från index)
├── karta.html          # Dedikerad kartsida
├── data.js             # Förskoldata (JavaScript format)
├── Förskolor_rows.csv  # Rådata för förskolor
├── README.md           # Denna fil
└── .gitignore          # Git ignore-fil
```

## 🛠️ Teknologier

- **HTML5** - Strukturen
- **CSS3** - Styling med moderna tekniker
- **JavaScript (ES6+)** - Funktionalitet
- **Leaflet** - Interaktiva kartor
- **Chart.js** - Statistikdiagram
- **OpenStreetMap** - Kartdata

## 📊 Data

Projektet använder offentlig data om förskolor i Sverige som inkluderar:
- Namn och adress
- Antal barn och barngrupper
- Personalstatistik
- Huvudmannaskap (kommunal/enskild)
- Kvalitetsmått

## 🎯 Funktioner i detalj

### Kartfunktionalitet
- Klusterhantering för bättre prestanda
- Popup-information för varje förskola
- Färgkodning baserat på huvudmannaskap
- GPS-lokalisering för att hitta närliggande förskolor

### Sök och filtrera
- Autocomplete-sök på namn, kommun och adress
- Snabbfilter för huvudmannaskap och storlek
- Realtidssökning med debouncing

### Statistik
- Översiktsstatistik för hela landet
- Interaktiva diagram och visualiseringar
- Rankings för kommuner
- Jämförelse mot rikssnitt

### Jämförelsefunktion
- Jämför upp till 5 förskolor samtidigt
- Färgkodning för bästa/sämsta värden
- Detaljerad tabellvy
- Exportfunktionalitet

## 🤝 Bidra

1. Forka projektet
2. Skapa en feature branch (`git checkout -b feature/amazing-feature`)
3. Committa dina ändringar (`git commit -m 'Add amazing feature'`)
4. Pusha till branch (`git push origin feature/amazing-feature`)
5. Öppna en Pull Request

## 📝 Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## 🙏 Erkännanden

- Data från Skolverket och andra offentliga källor
- Kartdata från OpenStreetMap
- Ikoner från diverse open source-projekt

## 📞 Kontakt

Om du har frågor eller förslag, skapa gärna en issue eller kontakta projektägaren.

---

**Utvecklat med ❤️ för att göra förskoledata mer tillgänglig för alla.**

🚀 **Live-sida:** Denna applikation är nu live och uppdateras automatiskt via GitHub!