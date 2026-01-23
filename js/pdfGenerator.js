// PDF Generator for goFLY Tickets

class PDFGenerator {
    constructor(ticketData) {
        this.data = ticketData;
        this.doc = null;
    }

    async generatePDF() {
        const { jsPDF } = window.jspdf;
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = this.doc.internal.pageSize.getWidth();
        const pageHeight = this.doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Header
        yPos = this.drawHeader(yPos, pageWidth);

        // Electronic Ticket Title
        yPos = this.drawTitle(yPos, pageWidth);

        // Passenger Information
        yPos = this.drawPassengerInfo(yPos, pageWidth);

        // Flight Itinerary
        yPos = this.drawFlightItinerary(yPos, pageWidth, pageHeight);

        // Fare Information
        yPos = this.drawFareInfo(yPos, pageWidth, pageHeight);

        // Footer
        this.drawFooter(pageHeight);

        // Save the PDF
        const fileName = `goFLY_Ticket_${this.data.bookingReference || 'Booking'}_${new Date().getTime()}.pdf`;
        this.doc.save(fileName);
    }

    drawHeader(yPos, pageWidth) {
        // Company name
        this.doc.setFontSize(24);
        this.doc.setTextColor(59, 130, 246);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('goFLY Limited', 15, yPos);

        // Tagline
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'italic');
        this.doc.text('...let you fly', 15, yPos + 6);

        // Company info (right side)
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'normal');
        this.doc.setTextColor(100, 100, 100);
        const infoLines = [
            'Office Address: 1/1, Shukrabad, Dhaka 1207',
            '(Beside New Model College / Opposite of Metro Shopping Mall)',
            'For Support: Ask@goflybd.com | After-Sales: Service@goflybd.com'
        ];

        infoLines.forEach((line, index) => {
            this.doc.text(line, pageWidth - 15, yPos + (index * 4), { align: 'right' });
        });

        // Horizontal line
        this.doc.setDrawColor(59, 130, 246);
        this.doc.setLineWidth(0.5);
        this.doc.line(15, yPos + 15, pageWidth - 15, yPos + 15);

        return yPos + 20;
    }

    drawTitle(yPos, pageWidth) {
        this.doc.setFillColor(59, 130, 246);
        this.doc.rect(15, yPos, pageWidth - 30, 10, 'F');

        this.doc.setFontSize(14);
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Electronic Ticket', pageWidth / 2, yPos + 7, { align: 'center' });

        return yPos + 15;
    }

    drawPassengerInfo(yPos, pageWidth) {
        // Section header
        this.doc.setFillColor(239, 246, 255);
        this.doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        this.doc.setFontSize(12);
        this.doc.setTextColor(30, 64, 175);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Passenger Information', 17, yPos + 5.5);

        yPos += 12;

        // Booking Reference and Date
        this.doc.setFontSize(9);
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Booking Reference:', 15, yPos);
        this.doc.setFont(undefined, 'normal');
        this.doc.text(this.data.bookingReference || 'N/A', 55, yPos);

        if (this.data.issueDate) {
            this.doc.setFont(undefined, 'bold');
            this.doc.text('Issue Date:', pageWidth - 65, yPos);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(this.data.issueDate, pageWidth - 35, yPos, { align: 'right' });
        }

        yPos += 8;

        // Passenger table
        if (this.data.passengers && this.data.passengers.length > 0) {
            const tableData = this.data.passengers.map((pax, index) => [
                (index + 1).toString(),
                pax.name,
                pax.type,
                pax.passport || 'N/A',
                pax.ticketNumber || this.data.ticketNumbers[index] || 'N/A'
            ]);

            this.drawTable(
                15,
                yPos,
                pageWidth - 30,
                ['#', 'Passenger Name', 'Type', 'Passport', 'Ticket Number'],
                tableData,
                [10, 50, 25, 25, 35]
            );

            yPos += 10 + (tableData.length * 8);
        }

        // Additional PNRs
        if (this.data.airlinePNR || this.data.galileoPNR) {
            yPos += 5;
            this.doc.setFontSize(9);
            this.doc.setFont(undefined, 'bold');

            if (this.data.airlinePNR) {
                this.doc.text('Airline PNR:', 15, yPos);
                this.doc.setFont(undefined, 'normal');
                this.doc.text(this.data.airlinePNR, 45, yPos);
            }

            if (this.data.galileoPNR) {
                this.doc.setFont(undefined, 'bold');
                this.doc.text('Galileo PNR:', pageWidth - 65, yPos);
                this.doc.setFont(undefined, 'normal');
                this.doc.text(this.data.galileoPNR, pageWidth - 35, yPos);
            }

            yPos += 6;
        }

        return yPos + 5;
    }

    drawFlightItinerary(yPos, pageWidth, pageHeight) {
        // Section header
        this.doc.setFillColor(239, 246, 255);
        this.doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        this.doc.setFontSize(12);
        this.doc.setTextColor(30, 64, 175);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Itinerary Information', 17, yPos + 5.5);

        yPos += 12;

        // Draw each flight
        if (this.data.flights && this.data.flights.length > 0) {
            this.data.flights.forEach((flight, index) => {
                // Check if we need a new page
                if (yPos > pageHeight - 60) {
                    this.doc.addPage();
                    yPos = 20;
                }

                yPos = this.drawFlightCard(yPos, pageWidth, flight, index + 1);
                yPos += 5;
            });
        } else {
            this.doc.setFontSize(9);
            this.doc.setFont(undefined, 'italic');
            this.doc.setTextColor(100, 100, 100);
            this.doc.text('No flight information available', 15, yPos);
            yPos += 10;
        }

        return yPos;
    }

    drawFlightCard(yPos, pageWidth, flight, flightNum) {
        const startY = yPos;

        // Flight card background
        this.doc.setFillColor(249, 250, 251);
        this.doc.setDrawColor(229, 231, 235);
        this.doc.roundedRect(15, yPos, pageWidth - 30, 40, 2, 2, 'FD');

        yPos += 6;

        // Flight header
        this.doc.setFontSize(10);
        this.doc.setTextColor(30, 64, 175);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(`Flight ${flightNum}: ${flight.airline || 'Airline'} ${flight.flightNumber || ''}`, 18, yPos);

        // Status badge
        if (flight.status) {
            const statusX = pageWidth - 40;
            this.doc.setFillColor(209, 250, 229);
            this.doc.roundedRect(statusX, yPos - 3, 22, 5, 1, 1, 'F');
            this.doc.setFontSize(8);
            this.doc.setTextColor(6, 95, 70);
            this.doc.text(flight.status, statusX + 11, yPos, { align: 'center' });
        }

        yPos += 8;

        // Route visualization
        const routeStartX = 18;
        const routeWidth = pageWidth - 36;

        // From city
        this.doc.setFontSize(11);
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(flight.from || 'Origin', routeStartX, yPos);

        if (flight.fromCode) {
            this.doc.setFontSize(8);
            this.doc.setTextColor(100, 100, 100);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(`(${flight.fromCode})`, routeStartX, yPos + 4);
        }

        // Arrow
        this.doc.setFontSize(12);
        this.doc.setTextColor(59, 130, 246);
        this.doc.text('→', pageWidth / 2 - 5, yPos);

        // To city
        const toX = pageWidth - 35;
        this.doc.setFontSize(11);
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(flight.to || 'Destination', toX, yPos, { align: 'right' });

        if (flight.toCode) {
            this.doc.setFontSize(8);
            this.doc.setTextColor(100, 100, 100);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(`(${flight.toCode})`, toX, yPos + 4, { align: 'right' });
        }

        yPos += 10;

        // Flight details
        this.doc.setFontSize(8);
        this.doc.setTextColor(60, 60, 60);
        this.doc.setFont(undefined, 'normal');

        const details = [];
        if (flight.departureDate) details.push(`Date: ${flight.departureDate}`);
        if (flight.departureTime) details.push(`Depart: ${flight.departureTime}`);
        if (flight.arrivalTime) details.push(`Arrive: ${flight.arrivalTime}`);
        if (flight.duration) details.push(`Duration: ${flight.duration}`);
        if (flight.class) details.push(`Class: ${flight.class}`);
        if (flight.aircraft) details.push(`Aircraft: ${flight.aircraft}`);
        if (flight.baggage) details.push(`Baggage: ${flight.baggage}`);

        let detailX = 18;
        let detailY = yPos;
        details.forEach((detail, index) => {
            if (index > 0 && index % 3 === 0) {
                detailY += 4;
                detailX = 18;
            }
            this.doc.text(detail, detailX, detailY);
            detailX += 60;
        });

        return startY + 45;
    }

    drawFareInfo(yPos, pageWidth, pageHeight) {
        // Check if we need a new page
        if (yPos > pageHeight - 50) {
            this.doc.addPage();
            yPos = 20;
        }

        // Section header
        this.doc.setFillColor(239, 246, 255);
        this.doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        this.doc.setFontSize(12);
        this.doc.setTextColor(30, 64, 175);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Fare Information', 17, yPos + 5.5);

        yPos += 12;

        // Fare table
        const fareData = [];
        if (this.data.fare.baseFare) {
            fareData.push(['Base Fare', `${this.data.fare.baseFare} ${this.data.fare.currency}`]);
        }
        if (this.data.fare.tax) {
            fareData.push(['Tax & Fees', `${this.data.fare.tax} ${this.data.fare.currency}`]);
        }
        if (this.data.fare.total) {
            fareData.push(['Total Amount', `${this.data.fare.total} ${this.data.fare.currency}`]);
        }

        if (fareData.length > 0) {
            fareData.forEach(([label, value], index) => {
                const isTotal = index === fareData.length - 1;

                if (isTotal) {
                    this.doc.setFillColor(240, 249, 255);
                    this.doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F');
                    this.doc.setFont(undefined, 'bold');
                } else {
                    this.doc.setFont(undefined, 'normal');
                }

                this.doc.setFontSize(10);
                this.doc.setTextColor(0, 0, 0);
                this.doc.text(label, 20, yPos + 3);
                this.doc.text(value, pageWidth - 20, yPos + 3, { align: 'right' });

                yPos += 8;
            });
        }

        return yPos + 10;
    }

    drawFooter(pageHeight) {
        const yPos = pageHeight - 15;

        this.doc.setFontSize(7);
        this.doc.setTextColor(100, 100, 100);
        this.doc.setFont(undefined, 'italic');

        const footerText = 'This is an electronically generated ticket. Please verify all details before travel.';
        this.doc.text(footerText, this.doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

        this.doc.setFont(undefined, 'normal');
        this.doc.text('Generated by goFLY Limited - www.goflybd.com', this.doc.internal.pageSize.getWidth() / 2, yPos + 4, { align: 'center' });
    }

    drawTable(x, y, width, headers, data, columnWidths) {
        const rowHeight = 8;
        const headerHeight = 8;

        // Draw header
        this.doc.setFillColor(239, 246, 255);
        this.doc.rect(x, y, width, headerHeight, 'F');

        this.doc.setFontSize(8);
        this.doc.setTextColor(30, 64, 175);
        this.doc.setFont(undefined, 'bold');

        let currentX = x + 2;
        headers.forEach((header, index) => {
            this.doc.text(header, currentX, y + 5.5);
            currentX += columnWidths[index];
        });

        y += headerHeight;

        // Draw rows
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFont(undefined, 'normal');

        data.forEach((row, rowIndex) => {
            if (rowIndex % 2 === 0) {
                this.doc.setFillColor(249, 250, 251);
                this.doc.rect(x, y, width, rowHeight, 'F');
            }

            currentX = x + 2;
            row.forEach((cell, cellIndex) => {
                this.doc.text(String(cell), currentX, y + 5.5);
                currentX += columnWidths[cellIndex];
            });

            y += rowHeight;
        });

        // Draw border
        this.doc.setDrawColor(229, 231, 235);
        this.doc.rect(x, y - (data.length * rowHeight) - headerHeight, width, (data.length * rowHeight) + headerHeight);
    }
}
