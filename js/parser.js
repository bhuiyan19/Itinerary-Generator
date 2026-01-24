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

    // Helper to identify garbage lines (company info, headers, etc.)
    isGarbageLine(line) {
        const garbagePatterns = [
            /trade\s+license/i,
            /email:/i,
            /tel:/i,
            /business\s+hours/i,
            /iata\s+number/i,
            /mocat\s+registration/i,
            /^electronic\s+ticket$/i,
            /^passenger\s+information$/i,
            /^itinerary\s+information$/i,
            /^flight\s*#/i,
            /^from\s+to\s+depart/i,
            /galileo\s+pnr/i,
            /airline\s+pnr/i,
            /date\s+of\s+issue/i,
            /baggage\s*:/i,
            /class\s*:/i,
            /duration\s*:/i,
            /status\s*:/i,
            /aircraft\s*:/i,
            /terminal\s+\d/i,
            /intl\s+arpt/i,
            /international\s+arpt/i,
            /seat\s+info/i,
            /^number$/i,
            /^ticket$/i,
            /^passport$/i,
            /^\s*$/,  // empty lines
            /www\./i,
            /\.com/i,
            /@/,  // email addresses
            /\+\d{1,3}\s*\d/,  // phone numbers
            /:\s*[^;]+;$/,  // CSS properties (e.g., "color: red;")
            /var\(/,  // CSS variables
            /\d+px/i,  // CSS pixel values
            /\d+%/,  // CSS percentage values
            /\d+em/i,  // CSS em values
            /\d+rem/i,  // CSS rem values
            /(transform|margin|padding|border|background|display|flex|grid|font|color|width|height|position|top|left|right|bottom):/i,  // CSS properties
        ];

        return garbagePatterns.some(pattern => pattern.test(line));
    }

    // Helper to validate if a string is a real passenger name
    isValidPassengerName(name) {
        // Must be at least 2 words
        const words = name.trim().split(/\s+/);
        if (words.length < 2) return false;

        // Each word must be at least 3 letters (reject "Pm Iata", "Bdt Bd")
        const hasShortWords = words.some(word => word.length < 3);
        if (hasShortWords) return false;

        // Must be reasonable length
        if (name.length < 7 || name.length > 50) return false;

        // Skip common non-name patterns
        const invalidPatterns = [
            /^(passenger|name|type|adult|male|female|flight|airline|traveler|information|please|read)$/i,
            /trade\s+license/i,
            /bashati|horizon|banani|block/i,
            /email|business|hours|number/i,
            /dynamic\s+travels/i,
            /\d{4,}/,  // contains long numbers
            /@/,  // email
            /www\./i,  // website
            /\.com/i,
            /pnr|galileo|iata/i,
            /ticket.*number/i,
            /^[A-Z]+$/,  // all caps single word
            /:/,  // contains colon (CSS property)
            /;/,  // contains semicolon (CSS)
            /\(/,  // contains parenthesis (CSS functions)
            /\[|\]/,  // contains brackets
            /\{|\}/,  // contains braces
            /var|transform|margin|padding|border|font|color|width|height|display/i,  // CSS keywords
            /px|em|rem|%|vh|vw/i,  // CSS units
            /#[0-9a-f]{3,6}/i,  // CSS color codes
            /^(bdt|bd|pm|am|usd|eur)$/i,  // Currency codes and time indicators
        ];

        return !invalidPatterns.some(pattern => pattern.test(name));
    }

    extractPassengers(text) {
        // Pattern 1: DYNAMIC TRAVELS format - "ISLAM/MD MOKARREMUL MR Passport Number 541642217 Ticket 1575060704563"
        // Note: Sometimes "Passenger Information" appears twice (as header and in data row), so we make it optional
        const dynamicPattern = /Passenger Information\s+(?:Passenger Information\s+)?([A-Z\/\s]+?)\s+(?:MR|MRS|MS|MISS|DR)\s+Passport\s+Number\s+[\d]+\s+(?:Frequent Flyer\s+Number\s+)?Ticket\s+(\d+)/i;
        const dynamicMatch = text.match(dynamicPattern);

        if (dynamicMatch) {
            const fullName = dynamicMatch[1].trim() + ' ' + (dynamicMatch[0].match(/(MR|MRS|MS|MISS|DR)/i)[0] || 'MR');
            // Convert "ISLAM/MD MOKARREMUL MR" to "Islam Md Mokarremul"
            const cleanedName = fullName.replace(/\s*(MR|MRS|MS|MISS|DR)\s*$/i, '')
                .split(/[\s\/]+/)
                .filter(part => part.length > 0)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ');

            this.data.passengers.push({
                name: cleanedName,
                passport: '',
                ticketNumber: dynamicMatch[2],
                type: 'Adult'
            });
            return;
        }

        // Pattern 2: "Traveler Ticket Number" format (e.g., "- Mr Md Shifat 157-2132963822 Qatar Airways")
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

        // Pattern 3: Table row format with intelligent filtering
        const lines = text.split('\n');
        let foundPassengers = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip garbage lines
            if (this.isGarbageLine(line)) {
                continue;
            }

            // Look for passenger name patterns
            if (/^(?:Mrs?|Mr|Ms|Miss|Dr)?\s*[A-Z][A-Z\s]+(?:[A-Z]{2,})/i.test(line)) {
                const nameParts = line.trim().split(/\s{2,}|\t/);
                const name = nameParts[0].trim();

                if (this.isValidPassengerName(name)) {
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

        // If no passengers found, try simpler pattern with filtering
        if (this.data.passengers.length === 0) {
            const nameMatches = text.matchAll(/(?:Mrs?|Ms|Miss|Dr)?\s*([A-Z]{2,}(?:\s+[A-Z]{2,})+)/g);
            const uniqueNames = new Set();

            for (const match of nameMatches) {
                const name = match[1].trim();
                if (this.isValidPassengerName(name)) {
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

    extractDynamicTravelsFormat(text) {
        const flights = [];

        // Pattern: Qatar Airways QR 639 followed by route info
        // Looking for airline name on one line, flight number on next line or same line
        const flightBlocks = text.split(/(?=Qatar Airways|Malaysia Airlines|Novair|Emirates|Singapore Airlines|Thai Airways|Air Asia|Biman Bangladesh)/gi);

        for (const block of flightBlocks) {
            // Must contain airline name and QR/MH etc code
            const airlineMatch = block.match(/(Qatar Airways|Malaysia Airlines|Novair|Emirates|Singapore Airlines|Thai Airways|Air Asia|Biman Bangladesh)/i);
            const flightNumMatch = block.match(/([A-Z]{2})\s*(\d{3,4})/);

            if (!airlineMatch || !flightNumMatch) continue;

            const flight = {
                airline: airlineMatch[1],
                flightNumber: flightNumMatch[1] + flightNumMatch[2],
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

            // Extract cities from format: "Dhaka - Hazrat Shahjalal Intl Arpt"
            const cityPattern = /([A-Za-z\s]+?)\s*-\s*([A-Za-z\s]+?(?:Intl|International)?\s*Arpt)/gi;
            const cityMatches = [...block.matchAll(cityPattern)];

            if (cityMatches.length >= 2) {
                // First match is departure city
                const depCity = cityMatches[0][1].trim();
                flight.from = this.extractCityName(depCity);

                // Second match is arrival city
                const arrCity = cityMatches[1][1].trim();
                flight.to = this.extractCityName(arrCity);
            }

            // Extract dates in format "Tue, 10 Feb 26" or "10 Feb 26"
            const datePattern = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi;
            const dates = [...block.matchAll(datePattern)];

            if (dates.length >= 2) {
                flight.departureDate = this.formatDate(dates[0][1]);
                flight.arrivalDate = this.formatDate(dates[1][1]);
            }

            // Extract times
            const timePattern = /\b(\d{1,2}:\d{2})\b/g;
            const times = [...block.matchAll(timePattern)];

            if (times.length >= 2) {
                flight.departureTime = times[0][1];
                flight.arrivalTime = times[1][1];
            }

            // Extract additional info
            const durationMatch = block.match(/Duration\s*:\s*(\d+h\s+\d+m)/i);
            if (durationMatch) flight.duration = durationMatch[1];

            const classMatch = block.match(/Class\s*:\s*([A-Z]-)?([A-Za-z]+)/i);
            if (classMatch) flight.class = classMatch[2];

            const aircraftMatch = block.match(/Aircraft\s*:\s*([^\n]+)/i);
            if (aircraftMatch) {
                flight.aircraft = aircraftMatch[1].trim().replace(/\s*(Special Svc|Operated by).*/i, '');
            }

            const baggageMatch = block.match(/Baggage\s*:\s*(\d+\s*PC)/i);
            if (baggageMatch) flight.baggage = baggageMatch[1].replace(/\s/g, '');

            const statusMatch = block.match(/Status\s*:\s*(\w+)/i);
            if (statusMatch) flight.status = statusMatch[1];

            // Only add if we have basic info
            if (flight.from && flight.to && flight.departureTime) {
                flights.push(flight);
            }
        }

        return flights;
    }

    extractCityName(locationText) {
        // Extract city from "Dhaka - Hazrat Shahjalal" -> "Dhaka"
        // Or "New York - John F Kennedy" -> "New York"
        const parts = locationText.split(/\s*-\s*/);
        if (parts.length > 0) {
            return this.capitalizeCity(parts[0].trim());
        }
        return this.capitalizeCity(locationText.trim());
    }

    extractFlightsFromTable(text) {
        // First try DYNAMIC TRAVELS table format
        const dynamicFlights = this.extractDynamicTravelsFormat(text);
        if (dynamicFlights.length > 0) {
            this.data.flights = dynamicFlights;
            return;
        }

        // Look for pattern like "Qatar Airways QR 639"
        const flightHeaderPattern = /(Qatar Airways|Malaysia Airlines|Novair|Emirates|Singapore Airlines|Thai Airways|Air Asia|Biman Bangladesh)\s+([A-Z]{2}\s*\d{2,4})/gi;
        const flightHeaders = [...text.matchAll(flightHeaderPattern)];

        if (flightHeaders.length > 0) {
            flightHeaders.forEach((headerMatch, idx) => {
                const startIdx = headerMatch.index;
                // Find next flight header or end of text
                const nextHeaderIdx = flightHeaders[idx + 1] ? flightHeaders[idx + 1].index : text.length;
                const flightSection = text.substring(startIdx, nextHeaderIdx);

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
                    if (depDateMatch) {
                        flight.departureDate = this.formatDate(depDateMatch[1]);
                    }

                    const depTimeMatch = depLine.match(/(\d{1,2}:\d{2})/);
                    if (depTimeMatch) {
                        flight.departureTime = depTimeMatch[1];
                    }

                    // Extract city name
                    // Match pattern: TIME AIRPORT_NAME CITY [Terminal...]
                    const depCityMatch = depLine.match(/(?:\d{1,2}:\d{2})\s+(.+?)(?:\s+Terminal|\s*$)/i);
                    if (depCityMatch) {
                        let fullLocation = depCityMatch[1].trim();

                        // Extract city from patterns like "HAZRAT SHAHJALAL INTL DHAKA" or "HAMAD INTERNATIONAL DOHA"
                        let cityMatch = fullLocation.match(/(?:INTL?|INTERNATIONAL)\s+([A-Z]+)/i);
                        if (cityMatch) {
                            flight.from = this.capitalizeCity(cityMatch[1]);
                        } else {
                            // Fallback: get last capital word (e.g., "MALPENSA MILAN" -> "MILAN")
                            const words = fullLocation.split(/\s+/);
                            for (let i = words.length - 1; i >= 0; i--) {
                                if (words[i] && /^[A-Z]{2,}$/i.test(words[i])) {
                                    flight.from = this.capitalizeCity(words[i]);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Extract arrival info
                const arrivalMatch = flightSection.match(/Arrival[^\n]*\n([^\n]+)/i);
                if (arrivalMatch) {
                    const arrLine = arrivalMatch[1];

                    const arrDateMatch = arrLine.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
                    if (arrDateMatch) {
                        flight.arrivalDate = this.formatDate(arrDateMatch[1]);
                    }

                    const arrTimeMatch = arrLine.match(/(\d{1,2}:\d{2})/);
                    if (arrTimeMatch) {
                        flight.arrivalTime = arrTimeMatch[1];
                    }

                    // Extract city name
                    // Match pattern: TIME AIRPORT_NAME CITY [Terminal...]
                    const arrCityMatch = arrLine.match(/(?:\d{1,2}:\d{2})\s+(.+?)(?:\s+Terminal|\s*$)/i);
                    if (arrCityMatch) {
                        let fullLocation = arrCityMatch[1].trim();

                        // Extract city from patterns like "HAZRAT SHAHJALAL INTL DHAKA" or "HAMAD INTERNATIONAL DOHA"
                        let cityMatch = fullLocation.match(/(?:INTL?|INTERNATIONAL)\s+([A-Z]+)/i);
                        if (cityMatch) {
                            flight.to = this.capitalizeCity(cityMatch[1]);
                        } else {
                            // Fallback: get last capital word (e.g., "MALPENSA MILAN" -> "MILAN")
                            const words = fullLocation.split(/\s+/);
                            for (let i = words.length - 1; i >= 0; i--) {
                                if (words[i] && /^[A-Z]{2,}$/i.test(words[i])) {
                                    flight.to = this.capitalizeCity(words[i]);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Extract duration
                const durationMatch = flightSection.match(/Duration[^\n]*\n([^\n]+)/i);
                if (durationMatch) {
                    const durMatch = durationMatch[1].match(/(\d{1,2}):(\d{2})h/);
                    if (durMatch) {
                        const hours = parseInt(durMatch[1]);
                        const mins = parseInt(durMatch[2]);
                        flight.duration = `${hours}h ${mins}m`;
                    }
                }

                // Extract class
                const classMatch = flightSection.match(/Class[^\n]*\n([^\n]+)/i);
                if (classMatch) {
                    const cls = classMatch[1].match(/(Economy|Business|First)/i);
                    if (cls) flight.class = cls[1];
                }

                // Extract aircraft/equipment
                const equipmentMatch = flightSection.match(/Equipment\s+([^\n]+)/i);
                if (equipmentMatch) {
                    // Clean up - take only the aircraft name, not extra text
                    let aircraft = equipmentMatch[1].trim();
                    // Remove any trailing non-aircraft text
                    aircraft = aircraft.replace(/\s*(Scan|Check-in|Not to be used).*/i, '');
                    flight.aircraft = aircraft.trim();
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
            'Biman Bangladesh',
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
