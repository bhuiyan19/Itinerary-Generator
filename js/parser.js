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
            /Reservation\s*PNR\s*:?\s*([A-Z0-9]+)/i,
            /Booking\s*ID\s*:?\s*([A-Z0-9]+)/i,
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
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+\w+,?\s+\d{4})/i,
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
            /Date\s*of\s*Issue\s*:?\s*(\d{1,2}[A-Za-z]{3}\d{2})/i,
            /Issue\s*Date\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.issueDate = this.formatDate(match[1]);
                break;
            }
        }

        // If not found, try to extract from context
        if (!this.data.issueDate) {
            const dateMatch = text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
            if (dateMatch) {
                this.data.issueDate = this.formatDate(dateMatch[1]);
            }
        }
    }

    extractPassengers(text) {
        // Pattern 1: Passenger Information table format
        const passengerPattern1 = /(?:Passenger\s*Information|Passenger\s*Details)[\s\S]*?(?:Name|Passenger)[\s\S]*?([A-Z][A-Z\s\/]+?)(?:\s+(?:Adult|Male|Female)|Passport|Type)/gi;

        // Pattern 2: Name with passport
        const passengerPattern2 = /(?:Name|Passenger\s*\d+)\s*[:|\s]\s*([A-Z][A-Z\s]+?)(?:\s+(?:Adult|Male|Female)|Passport|Ticket)/gi;

        // Pattern 3: Table row format
        const lines = text.split('\n');
        let foundPassengers = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for passenger name patterns
            if (/^(?:Mrs?|Mr|Ms|Miss|Dr)?\s*[A-Z][A-Z\s]+(?:[A-Z]{2,})/i.test(line)) {
                const nameParts = line.trim().split(/\s{2,}|\t/);
                const name = nameParts[0].trim();

                if (name.length > 3 && !name.match(/^(Passenger|Name|Type|Adult|Male|Female|Flight|Airline)$/i)) {
                    // Extract passport if on same line
                    let passport = '';
                    const passportMatch = line.match(/[A-Z]{1,2}\d{7,9}/);
                    if (passportMatch) {
                        passport = passportMatch[0];
                    }

                    // Extract ticket number if present
                    let ticketNumber = '';
                    const ticketMatch = line.match(/\d{13,14}/);
                    if (ticketMatch) {
                        ticketNumber = ticketMatch[0];
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
                if (name.length > 5 && !name.match(/GOFLY|LIMITED|AIRLINE|PASSENGER|INFORMATION/)) {
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
        // Look for flight table patterns
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

        // Extract tax
        const taxPatterns = [
            /Tax\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /AIT\s*[&\/]\s*VAT\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        ];

        for (const pattern of taxPatterns) {
            const match = text.match(pattern);
            if (match) {
                this.data.fare.tax = match[1].replace(/,/g, '');
                break;
            }
        }

        // Extract total
        const totalPatterns = [
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
        // Airline PNR
        const airlinePNRMatch = text.match(/Airline\s*PNR\s*:?\s*([A-Z0-9]{6})/i);
        if (airlinePNRMatch) {
            this.data.airlinePNR = airlinePNRMatch[1];
        }

        // Galileo PNR
        const galileoPNRMatch = text.match(/Galileo\s*PNR\s*:?\s*([A-Z0-9]{6})/i);
        if (galileoPNRMatch) {
            this.data.galileoPNR = galileoPNRMatch[1];
        }

        // Extract all ticket numbers
        const ticketNumbers = text.matchAll(/\b\d{13,14}\b/g);
        for (const match of ticketNumbers) {
            if (!this.data.ticketNumbers.includes(match[0])) {
                this.data.ticketNumbers.push(match[0]);
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
