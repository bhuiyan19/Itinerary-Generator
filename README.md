# goFLY Ticket Generator

A web-based ticket formatter that converts raw ticket data from various vendors into a unified, professional goFLY branded PDF format.

## 🎯 Purpose

This tool solves the problem of dealing with multiple vendor ticket formats by:
- Converting any vendor's ticket data into a standardized goFLY format
- Removing vendor branding and applying goFLY branding
- Generating clean, professional PDF tickets
- Supporting desktop and mobile browsers

## ✨ Features

- **Multi-Vendor Support**: Automatically detects and parses tickets from:
  - Malaysia Airlines
  - Qatar Airways
  - Novair
  - And other airline formats

- **Simple Copy-Paste Interface**: Just copy ticket text and paste - no manual data entry needed

- **goFLY Branded Output**: All tickets use consistent goFLY branding regardless of source

- **PDF Generation**: Create downloadable, printable PDF tickets

- **Responsive Design**: Works on desktop and mobile browsers

## 🚀 Getting Started

### Installation

No installation required! This is a client-side web application.

1. Clone or download this repository
2. Open `index.html` in any modern web browser

### Usage

1. **Copy Ticket Data**:
   - Open your vendor ticket (email, PDF, web page)
   - Select all text and copy (Ctrl+C / Cmd+C)

2. **Paste Data**:
   - Open the goFLY Ticket Generator in your browser
   - Paste the copied text into the text area

3. **Parse & Preview**:
   - Click "Parse & Preview" button
   - Review the formatted ticket

4. **Generate PDF**:
   - Click "Generate PDF" to download your goFLY branded ticket

## 📁 Project Structure

```
Itinerary-Generator/
├── index.html              # Main application page
├── css/
│   └── style.css          # Styling and layout
├── js/
│   ├── parser.js          # Ticket data parser
│   ├── pdfGenerator.js    # PDF generation logic
│   └── app.js             # Main application logic
└── README.md              # This file
```

## 🔧 Technical Details

### Technologies Used

- **HTML5**: Structure
- **CSS3**: Styling with responsive design
- **JavaScript (ES6+)**: Application logic
- **jsPDF**: PDF generation library
- **html2canvas**: For rendering complex layouts

### Supported Data Fields

The parser automatically extracts:

**Passenger Information:**
- Name(s)
- Passport number(s)
- Ticket number(s)
- Passenger type (Adult/Child/Infant)

**Flight Details:**
- Airline and flight number
- Route (origin → destination)
- Departure/arrival dates and times
- Flight duration
- Aircraft type
- Class of service
- Baggage allowance

**Booking Information:**
- Booking reference (PNR)
- Airline PNR
- Galileo PNR
- Issue date
- Confirmation status

**Fare Information:**
- Base fare
- Taxes and fees
- Total amount
- Currency

## 🎨 Customization

### Branding

To customize the branding, edit:
- Company name and contact info in `index.html` (header section)
- Colors in `css/style.css` (CSS variables or direct color values)
- PDF layout in `js/pdfGenerator.js`

### Supported Formats

To add support for new vendor formats:
1. Open `js/parser.js`
2. Add new parsing patterns in the relevant extraction methods
3. Test with sample data

## 📝 Example Ticket Formats

The system has been tested with:

1. **Malaysia Airlines** - Multi-leg itineraries with detailed flight segments
2. **Qatar Airways** - Multi-passenger bookings with segment details
3. **Novair** - Simple one-way/round-trip tickets

## 🐛 Troubleshooting

### Parser Not Detecting Data

- Ensure you've copied all the ticket text
- Check that the text includes key identifiers (flight numbers, passenger names, etc.)
- Some PDF copy operations may include extra formatting - try copying from the email version

### PDF Not Generating

- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Check browser console for error messages
- Make sure CDN libraries are loading (check internet connection)

### Missing Fields

- Not all vendors include all fields
- The parser fills in what it can find
- Review the preview before generating PDF

## 🔒 Privacy & Security

- **Client-Side Processing**: All data processing happens in your browser
- **No Data Storage**: No ticket information is sent to any server or stored
- **No External Dependencies**: Works offline after initial load (CDN libraries are cached)

## 📱 Browser Support

- ✅ Chrome/Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Support

For issues or questions:
- Email: Ask@goflybd.com
- After-sales: Service@goflybd.com

## 📄 License

Copyright © 2025 goFLY Limited. All rights reserved.

---

**goFLY Limited**
Office Address: 1/1, Shukrabad, Dhaka 1207
(Beside New Model College / Opposite of Metro Shopping Mall)
...let you fly
