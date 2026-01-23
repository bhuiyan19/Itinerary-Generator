// Ticket Data Parser for different vendor formats

class TicketParser {
    constructor(rawText) {
        this.rawText = rawText;
        this.data = {
            bookingReference: '',
            issueDate: '',
            passengers: [],
            flights: [],
            fare: {
                baseFare: '',
                tax: '',
                total: '',
                currency: 'BDT'
            },
            airlinePNR: '',
            galileoPNR: '',
            ticketNumbers: []
        };
    }

    parse() {
        try {
            // Clean the text
            const text = this.rawText.trim();

            // Extract booking reference / PNR
            this.extractBookingReference(text);

            // Extract issue date
            this.extractIssueDate(text);

            // Extract passengers
            this.extractPassengers(text);

            // Extract flights
            this.extractFlights(text);

            // Extract fare information
            this.extractFare(text);

            // Extract additional PNRs
            this.extractPNRs(text);

            return this.data;
        } catch (error) {
            throw new Error(`Failed to parse ticket: ${error.message}`);
        }
    }

    extractBookingReference(text) {
        // Try different patterns for booking reference
        const patterns = [
            /Booking\s+ref\s+([A-Z0-9]+)/i,
            /Reservation\s*PNR\s*:?\s*([A-Z0-9]+)/i,
            /Booking\s*ID\s*:?\s*([A-Z0-9]+)/i,
            /Booking\s*Reference\s*:?\s*([A-Z0-9]+)/i,
            /PNR\s*:?\s*([A-Z0-9]+)/i,
            /Reservation\s*(?:PNR|Code)\s*:?\s*([A-Z0-9]{6})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.bookingReference = match[1].trim();
                break;
            }
        }
    }

    extractIssueDate(text) {
        const patterns = [
            /Ticketed\s+Date\s*:?\s*(\d{1,2}[A-Za-z]{3}\d{2})/i,
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+\w+,?\s+\d{4})/i,
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
            /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})/i,
            /Date\s*of\s*Issue\s*:?\s*(\d{1,2}[A-Za-z]{3}\d{2})/i,
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.issueDate = this.formatDate(match[1]);
                break;
            }
        }

        // If not found, try to extract from first few lines (should be near top)
        if (!this.data.issueDate) {
            const topLines = text.substring(0, 500); // Check first 500 chars only
            const dateMatch = topLines.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
            if (dateMatch) {
                this.data.issueDate = this.formatDate(dateMatch[1]);
            }
        }
    }

    extractPassengers(text) {
        // Pattern for "Traveler Ticket Number" format (e.g., "- Mr Md Shifat 157-2132963822 Qatar Airways")
        const travelerPattern = /[-\s]*(?:Mr|Mrs|Ms|Miss|Dr)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(\d{3}-\d{10})/gi;
        const travelerMatches = [...text.matchAll(travelerPattern)];

        const uniquePassengers = new Set();

        if (travelerMatches.length > 0) {
            travelerMatches.forEach(match => {
                const name = this.cleanName(match[1]);
                // Only add if not already added (avoid duplicates)
                if (!uniquePassengers.has(name)) {
                    uniquePassengers.add(name);
                    this.data.passengers.push({
                        name: name,
                        passport: '',
                        ticketNumber: match[2].replace(/-/g, ''),
                        type: 'Adult'
                    });
                }
            });

            // If we found passengers, return
            if (this.data.passengers.length > 0) {
                return;
            }
        }

        // Pattern 3: Table row format
        const lines = text.split('\n');
        let foundPassengers = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for passenger name patterns
            if (/^(?:Mrs?|Mr|Ms|Miss|Dr)?\s*[A-Z][A-Z\s]+(?:[A-Z]{2,})/i.test(line)) {
                const nameParts = line.trim().split(/\s{2,}|\t/);
                const name = nameParts[0].trim();

                if (name.length > 3 && !name.match(/^(Passenger|Name|Type|Adult|Male|Female|Flight|Airline|Traveler)$/i)) {
                    // Extract passport if on same line
                    let passport = '';
                    const passportMatch = line.match(/[A-Z]{1,2}\d{7,9}/);
                    if (passportMatch) {
                        passport = passportMatch[0];
                    }

                    // Extract ticket number if present (with or without hyphens)
                    let ticketNumber = '';
                    const ticketMatch = line.match(/(\d{3}-?\d{10}|\d{13,14})/);
                    if (ticketMatch) {
                        ticketNumber = ticketMatch[1].replace(/-/g, '');
                    }

                    // Extract type (Adult/Child)
                    let type = 'Adult';
                    if (line.match(/Adult.*Female/i)) type = 'Adult - Female';
                    else if (line.match(/Adult.*Male/i)) type = 'Adult - Male';
                    else if (line.match(/Child/i)) type = 'Child';

                    this.data.passengers.push({
                        name: this.cleanName(name),
                        passport: passport,
                        ticketNumber: ticketNumber,
                        type: type
                    });
                    foundPassengers = true;
                }
            }
        }

        // If no passengers found, try simpler pattern
        if (this.data.passengers.length === 0) {
            const nameMatches = text.matchAll(/(?:Mrs?|Ms|Miss|Dr)?\s*([A-Z]{2,}(?:\s+[A-Z]{2,})+)/g);
            const uniqueNames = new Set();

            for (const match of nameMatches) {
                const name = match[1].trim();
                if (name.length > 5 && !name.match(/GOFLY|LIMITED|AIRLINE|PASSENGER|INFORMATION|TRAVELS|HORIZON/)) {
                    uniqueNames.add(name);
                }
            }

            uniqueNames.forEach(name => {
                this.data.passengers.push({
                    name: this.cleanName(name),
                    passport: '',
                    ticketNumber: '',
                    type: 'Adult'
                });
            });
        }
    }

    extractFlights(text) {
        const lines = text.split('\n');

        // Look for flight segments
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Pattern: City -> City with airline
            const routePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\(([A-Z]{3})\))?\s*(?:->|→|➔)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\(([A-Z]{3})\))?/;
            const routeMatch = line.match(routePattern);

            if (routeMatch) {
                const flight = {
                    from: routeMatch[1].trim(),
                    fromCode: routeMatch[2] || '',
                    to: routeMatch[3].trim(),
                    toCode: routeMatch[4] || '',
                    airline: '',
                    flightNumber: '',
                    departureDate: '',
                    departureTime: '',
                    arrivalDate: '',
                    arrivalTime: '',
                    duration: '',
                    aircraft: '',
                    class: 'Economy',
                    status: 'Confirmed',
                    baggage: ''
                };

                // Look for airline and flight number nearby
                const airlinePattern = /(Qatar Airways|Malaysia Airlines|Novair|Air\s+\w+|[A-Z]{2,3}\s*\d{2,4})/i;
                const airlineMatch = line.match(airlinePattern) || lines[i-1]?.match(airlinePattern) || lines[i+1]?.match(airlinePattern);
                if (airlineMatch) {
                    flight.airline = airlineMatch[1].trim();
                }

                // Extract flight number
                const flightNumPattern = /(?:Flight\s*(?:No|#|Number)\s*:?\s*)?([A-Z]{2}\s*\d{2,4})/i;
                const flightNumMatch = (line + ' ' + (lines[i+1] || '')).match(flightNumPattern);
                if (flightNumMatch) {
                    flight.flightNumber = flightNumMatch[1].replace(/\s+/g, '');
                }

                // Extract dates and times
                const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{2,4})/gi;
                const timePattern = /(\d{1,2}:\d{2})/g;

                const contextText = lines.slice(Math.max(0, i-2), Math.min(lines.length, i+5)).join(' ');
                const dates = [...contextText.matchAll(datePattern)];
                const times = [...contextText.matchAll(timePattern)];

                if (dates.length >= 1) {
                    flight.departureDate = this.formatDate(dates[0][1]);
                    flight.arrivalDate = dates.length > 1 ? this.formatDate(dates[1][1]) : flight.departureDate;
                }

                if (times.length >= 1) {
                    flight.departureTime = times[0][1];
                    flight.arrivalTime = times.length > 1 ? times[1][1] : '';
                }

                // Extract additional details
                const durationMatch = contextText.match(/Duration\s*:?\s*(\d+h\s*\d+m)/i);
                if (durationMatch) flight.duration = durationMatch[1];

                const aircraftMatch = contextText.match(/Aircraft\s*:?\s*(Boeing\s*\d+[A-Z]*|Airbus\s*A\d+)/i);
                if (aircraftMatch) flight.aircraft = aircraftMatch[1];

                const classMatch = contextText.match(/(Economy|Business|First|Premium)\s*(?:Class|\()/i);
                if (classMatch) flight.class = classMatch[1];

                const baggageMatch = contextText.match(/(?:Baggage|Check-in)\s*:?\s*(\d+\s*(?:KG|Kilograms))/i);
                if (baggageMatch) flight.baggage = baggageMatch[1];

                this.data.flights.push(flight);
            }
        }

        // Alternative: Look for structured flight tables
        if (this.data.flights.length === 0) {
            this.extractFlightsFromTable(text);
        }
    }

    extractFlightsFromTable(text) {
        // Look for pattern like "Qatar Airways QR 639"
        const flightHeaderPattern = /(Qatar Airways|Malaysia Airlines|Novair|Emirates|Singapore Airlines|Thai Airways|Air Asia)\s+([A-Z]{2}\s*\d{2,4})/gi;
        const flightHeaders = [...text.matchAll(flightHeaderPattern)];

        if (flightHeaders.length > 0) {
            flightHeaders.forEach(headerMatch => {
                const startIdx = headerMatch.index;
                const nextFlightIdx = text.indexOf('Airways', startIdx + 10);
                const sectionEnd = nextFlightIdx > 0 ? nextFlightIdx : text.length;
                const flightSection = text.substring(startIdx, sectionEnd);

                const flight = {
                    airline: headerMatch[1],
                    flightNumber: headerMatch[2].replace(/\s+/g, ''),
                    from: '',
                    fromCode: '',
                    to: '',
                    toCode: '',
                    departureDate: '',
                    departureTime: '',
                    arrivalDate: '',
                    arrivalTime: '',
                    duration: '',
                    aircraft: '',
                    class: 'Economy',
                    status: 'Confirmed',
                    baggage: ''
                };

                // Extract departure info
                const departureMatch = flightSection.match(/Departure[^\n]*\n([^\n]+)/i);
                if (departureMatch) {
                    const depLine = departureMatch[1];
                    const depDateMatch = depLine.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
                    if (depDateMatch) flight.departureDate = this.formatDate(depDateMatch[1]);

                    const depTimeMatch = depLine.match(/(\d{1,2}:\d{2})/);
                    if (depTimeMatch) flight.departureTime = depTimeMatch[1];

                    // Extract city name - look for the last capital word before "Terminal"
                    const depCityMatch = depLine.match(/(?:\d{1,2}:\d{2})\s+(.+?)(?:\s+Terminal|$)/i);
                    if (depCityMatch) {
                        const fullLocation = depCityMatch[1].trim();
                        // Extract city: take last word or word after INTL/INTERNATIONAL
                        const cityMatch = fullLocation.match(/(?:INTL?|INTERNATIONAL)\s+([A-Z]+)|([A-Z]+)\s*$/i);
                        if (cityMatch) {
                            flight.from = this.capitalizeCity(cityMatch[1] || cityMatch[2]);
                        }
                    }
                }

                // Extract arrival info
                const arrivalMatch = flightSection.match(/Arrival[^\n]*\n([^\n]+)/i);
                if (arrivalMatch) {
                    const arrLine = arrivalMatch[1];
                    const arrDateMatch = arrLine.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
                    if (arrDateMatch) flight.arrivalDate = this.formatDate(arrDateMatch[1]);

                    const arrTimeMatch = arrLine.match(/(\d{1,2}:\d{2})/);
                    if (arrTimeMatch) flight.arrivalTime = arrTimeMatch[1];

                    // Extract city name - look for the last capital word before "Terminal"
                    const arrCityMatch = arrLine.match(/(?:\d{1,2}:\d{2})\s+(.+?)(?:\s+Terminal|$)/i);
                    if (arrCityMatch) {
                        const fullLocation = arrCityMatch[1].trim();
                        // Extract city: take last word or word after INTL/INTERNATIONAL
                        const cityMatch = fullLocation.match(/(?:INTL?|INTERNATIONAL)\s+([A-Z]+)|([A-Z]+)\s*$/i);
                        if (cityMatch) {
                            flight.to = this.capitalizeCity(cityMatch[1] || cityMatch[2]);
                        }
                    }
                }

                // Extract duration
                const durationMatch = flightSection.match(/Duration[^\n]*\n([^\n]+)/i);
                if (durationMatch) {
                    const durMatch = durationMatch[1].match(/(\d{2}:\d{2}h)/);
                    if (durMatch) flight.duration = durMatch[1].replace(/(\d{2}):(\d{2})h/, '$1h $2m');
                }

                // Extract class
                const classMatch = flightSection.match(/Class[^\n]*\n([^\n]+)/i);
                if (classMatch) {
                    const cls = classMatch[1].match(/(Economy|Business|First)/i);
                    if (cls) flight.class = cls[1];
                }

                // Extract aircraft/equipment
                const equipmentMatch = flightSection.match(/Equipment\s+([\w\s-]+)/i);
                if (equipmentMatch) {
                    flight.aircraft = equipmentMatch[1].trim();
                }

                // Extract baggage
                const baggageMatch = flightSection.match(/Baggage\s+Allowance\s+(\d+K)/i);
                if (baggageMatch) {
                    flight.baggage = baggageMatch[1] + 'G';
                }

                this.data.flights.push(flight);
            });
            return;
        }

        // Fallback to original pattern
        const flightPattern = /([A-Z]{2,3})\s*\d{2,4}[\s\S]{0,200}?([A-Z][a-z]+)[\s\S]{0,50}?([A-Z][a-z]+)[\s\S]{0,100}?(\d{1,2}:\d{2})/gi;
        const matches = [...text.matchAll(flightPattern)];

        matches.forEach(match => {
            const flight = {
                flightNumber: match[1] + match[0].match(/\d{2,4}/)[0],
                from: match[2],
                to: match[3],
                departureTime: match[4],
                airline: this.detectAirline(text),
                class: 'Economy',
                status: 'Confirmed',
                departureDate: '',
                arrivalDate: '',
                arrivalTime: '',
                duration: '',
                aircraft: '',
                baggage: ''
            };

            this.data.flights.push(flight);
        });
    }

    extractFare(text) {
        // Extract base fare
        const baseFarePatterns = [
            /Air\s+Fare\s*:?\s*(?:BDT|USD|EUR)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /Base\s*Fare\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(BDT|USD|EUR)?/i,
            /Fare\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(BDT|USD|EUR)?/i,
        ];

        for (const pattern of baseFarePatterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.fare.baseFare = match[1].replace(/,/g, '');
                if (match[2]) this.data.fare.currency = match[2];
                break;
            }
        }

        // Extract currency if found with Air Fare
        const currencyMatch = text.match(/Air\s+Fare\s*:?\s*(BDT|USD|EUR)/i);
        if (currencyMatch) this.data.fare.currency = currencyMatch[1];

        // Extract tax (handle multiple BDT entries)
        const taxPatterns = [
            /Tax\s*:?\s*((?:BDT\s+[\dA-Z]+\s*)+)/i,
            /Tax\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /AIT\s*[&\/]\s*VAT\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        ];

        for (const pattern of taxPatterns) {
            const match = text.match(pattern);
            if (match) {
                const taxStr = match[1];
                // If it contains multiple BDT entries, sum them up
                if (taxStr.includes('BDT')) {
                    const amounts = taxStr.matchAll(/(\d+)[A-Z]{0,2}/g);
                    let total = 0;
                    for (const amt of amounts) {
                        total += parseInt(amt[1]);
                    }
                    this.data.fare.tax = total.toString();
                } else {
                    this.data.fare.tax = taxStr.replace(/,/g, '');
                }
                break;
            }
        }

        // Extract total (handle newline before colon)
        const totalPatterns = [
            /Total\s+Amount\s*[\n\s]*:?\s*(?:BDT|USD|EUR)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /(?:Grand\s*)?Total\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(BDT|USD|EUR)?/i,
            /Total\s*(?:Amount|Fare)\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(BDT|USD|EUR)?/i,
        ];

        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.fare.total = match[1].replace(/,/g, '');
                if (match[2]) this.data.fare.currency = match[2];
                break;
            }
        }
    }

    extractPNRs(text) {
        // Airline Booking Reference (e.g., "QR/7P8LNW")
        const airlineBookingRefMatch = text.match(/Airline\s+Booking\s+Reference\s+([A-Z]{2})\/([A-Z0-9]{6})/i);
        if (airlineBookingRefMatch) {
            this.data.airlinePNR = airlineBookingRefMatch[2];
        }

        // Airline PNR
        if (!this.data.airlinePNR) {
            const airlinePNRMatch = text.match(/Airline\s*PNR\s*:?\s*([A-Z0-9]{6})/i);
            if (airlinePNRMatch) {
                this.data.airlinePNR = airlinePNRMatch[1];
            }
        }

        // Galileo PNR
        const galileoPNRMatch = text.match(/Galileo\s*PNR\s*:?\s*([A-Z0-9]{6})/i);
        if (galileoPNRMatch) {
            this.data.galileoPNR = galileoPNRMatch[1];
        }

        // Extract all ticket numbers (with or without hyphens)
        const ticketNumbers = text.matchAll(/\b(\d{3}-\d{10}|\d{13,14})\b/g);
        for (const match of ticketNumbers) {
            const cleanNumber = match[1].replace(/-/g, '');
            if (!this.data.ticketNumbers.includes(cleanNumber)) {
                this.data.ticketNumbers.push(cleanNumber);
            }
        }
    }

    detectAirline(text) {
        const airlines = [
            'Qatar Airways',
            'Malaysia Airlines',
            'Novair',
            'Emirates',
            'Singapore Airlines',
            'Thai Airways',
            'Air Asia'
        ];

        for (const airline of airlines) {
            if (text.includes(airline)) {
                return airline;
            }
        }

        return 'Unknown Airline';
    }

    cleanName(name) {
        return name
            .replace(/\s{2,}/g, ' ')
            .replace(/[_\-\/]/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    }

    capitalizeCity(cityName) {
        if (!cityName) return '';
        // Capitalize first letter, rest lowercase
        return cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    }

    formatDate(dateStr) {
        try {
            // Handle different date formats
            const monthMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };

            // Format: "15Sep25" or "15 Sep 25"
            const match1 = dateStr.match(/(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})/);
            if (match1) {
                const day = match1[1].padStart(2, '0');
                const month = match1[2].substring(0, 3);
                let year = match1[3];
                if (year.length === 2) year = '20' + year;

                return `${day} ${month} ${year}`;
            }

            return dateStr;
        } catch (e) {
            return dateStr;
        }
    }
}
