// Main Application Logic

let currentTicketData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const ticketInput = document.getElementById('ticketInput');
    const parseBtn = document.getElementById('parseBtn');
    const clearBtn = document.getElementById('clearBtn');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const editBtn = document.getElementById('editBtn');
    const previewSection = document.getElementById('previewSection');
    const errorSection = document.getElementById('errorSection');
    const ticketPreview = document.getElementById('ticketPreview');
    const errorMessage = document.getElementById('errorMessage');

    // Event Listeners
    parseBtn.addEventListener('click', parseAndPreview);
    clearBtn.addEventListener('click', clearInput);
    generatePdfBtn.addEventListener('click', generatePDF);
    editBtn.addEventListener('click', editData);

    // Parse and preview ticket
    function parseAndPreview() {
        const rawText = ticketInput.value.trim();

        if (!rawText) {
            showError('Please paste ticket data first.');
            return;
        }

        try {
            // Hide error section
            errorSection.style.display = 'none';

            // Parse the ticket
            const parser = new TicketParser(rawText);
            currentTicketData = parser.parse();

            // Generate preview
            generatePreview(currentTicketData);

            // Show preview section
            previewSection.style.display = 'block';

            // Scroll to preview
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            showError(error.message);
            previewSection.style.display = 'none';
        }
    }

    // Generate HTML preview
    function generatePreview(data) {
        let html = `
            <div class="ticket-header">
                <div class="ticket-company-info">
                    <h2>goFLY Limited</h2>
                    <p>Office Address: 1/1, Shukrabad, Dhaka 1207</p>
                    <p>(Beside New Model College / Opposite of Metro Shopping Mall)</p>
                    <p>For Support: Ask@goflybd.com | After-Sales: Service@goflybd.com</p>
                </div>
                <div class="ticket-title">Electronic Ticket</div>
            </div>

            <!-- Passenger Information -->
            <div class="ticket-section">
                <h3>Passenger Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Booking Reference</div>
                        <div class="info-value">${data.bookingReference || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Issue Date</div>
                        <div class="info-value">${data.issueDate || 'N/A'}</div>
                    </div>
        `;

        if (data.airlinePNR) {
            html += `
                    <div class="info-item">
                        <div class="info-label">Airline PNR</div>
                        <div class="info-value">${data.airlinePNR}</div>
                    </div>
            `;
        }

        if (data.galileoPNR) {
            html += `
                    <div class="info-item">
                        <div class="info-label">Galileo PNR</div>
                        <div class="info-value">${data.galileoPNR}</div>
                    </div>
            `;
        }

        html += `</div>`;

        // Passenger list
        if (data.passengers && data.passengers.length > 0) {
            html += `
                <table class="fare-table" style="margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Passenger Name</th>
                            <th>Type</th>
                            <th>Passport</th>
                            <th>Ticket Number</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.passengers.forEach((passenger, index) => {
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${passenger.name}</td>
                        <td>${passenger.type}</td>
                        <td>${passenger.passport || 'N/A'}</td>
                        <td>${passenger.ticketNumber || data.ticketNumbers[index] || 'N/A'}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        }

        html += `</div>`;

        // Flight Itinerary
        html += `
            <div class="ticket-section">
                <h3>Itinerary Information</h3>
        `;

        if (data.flights && data.flights.length > 0) {
            data.flights.forEach((flight, index) => {
                html += generateFlightCard(flight, index + 1);
            });
        } else {
            html += `<p style="color: #6b7280; font-style: italic;">No flight information available</p>`;
        }

        html += `</div>`;

        // Fare Information
        html += `
            <div class="ticket-section">
                <h3>Fare Information</h3>
                <table class="fare-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.fare.baseFare) {
            html += `
                        <tr>
                            <td>Base Fare</td>
                            <td style="text-align: right;">${formatCurrency(data.fare.baseFare, data.fare.currency)}</td>
                        </tr>
            `;
        }

        if (data.fare.tax) {
            html += `
                        <tr>
                            <td>Tax & Fees</td>
                            <td style="text-align: right;">${formatCurrency(data.fare.tax, data.fare.currency)}</td>
                        </tr>
            `;
        }

        if (data.fare.total) {
            html += `
                        <tr>
                            <td><strong>Total Amount</strong></td>
                            <td style="text-align: right;"><strong>${formatCurrency(data.fare.total, data.fare.currency)}</strong></td>
                        </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        ticketPreview.innerHTML = html;
    }

    // Generate flight card HTML
    function generateFlightCard(flight, flightNum) {
        return `
            <div class="flight-card">
                <div class="flight-header">
                    <div class="airline-logo">✈️</div>
                    <div class="flight-basic-info">
                        <h4>Flight ${flightNum}: ${flight.airline || 'Airline'} ${flight.flightNumber || ''}</h4>
                        ${flight.status ? `<span class="status-badge status-confirmed">${flight.status}</span>` : ''}
                    </div>
                </div>

                <div class="flight-route">
                    <div class="route-point">
                        <div class="route-city">${flight.from || 'Origin'}</div>
                        ${flight.fromCode ? `<div class="route-airport">${flight.fromCode}</div>` : ''}
                        ${flight.departureDate ? `<div class="route-datetime">${flight.departureDate}</div>` : ''}
                        ${flight.departureTime ? `<div class="route-datetime">${flight.departureTime}</div>` : ''}
                    </div>

                    <div class="route-arrow">→</div>

                    <div class="route-point">
                        <div class="route-city">${flight.to || 'Destination'}</div>
                        ${flight.toCode ? `<div class="route-airport">${flight.toCode}</div>` : ''}
                        ${flight.arrivalDate ? `<div class="route-datetime">${flight.arrivalDate}</div>` : ''}
                        ${flight.arrivalTime ? `<div class="route-datetime">${flight.arrivalTime}</div>` : ''}
                    </div>
                </div>

                <div class="flight-details-grid">
                    ${flight.class ? `
                        <div class="info-item">
                            <div class="info-label">Class</div>
                            <div class="info-value">${flight.class}</div>
                        </div>
                    ` : ''}
                    ${flight.duration ? `
                        <div class="info-item">
                            <div class="info-label">Duration</div>
                            <div class="info-value">${flight.duration}</div>
                        </div>
                    ` : ''}
                    ${flight.aircraft ? `
                        <div class="info-item">
                            <div class="info-label">Aircraft</div>
                            <div class="info-value">${flight.aircraft}</div>
                        </div>
                    ` : ''}
                    ${flight.baggage ? `
                        <div class="info-item">
                            <div class="info-label">Baggage</div>
                            <div class="info-value">${flight.baggage}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Generate PDF
    function generatePDF() {
        if (!currentTicketData) {
            showError('No ticket data available. Please parse a ticket first.');
            return;
        }

        try {
            const pdfGen = new PDFGenerator(currentTicketData);
            pdfGen.generatePDF();
        } catch (error) {
            showError('Failed to generate PDF: ' + error.message);
        }
    }

    // Clear input
    function clearInput() {
        ticketInput.value = '';
        previewSection.style.display = 'none';
        errorSection.style.display = 'none';
        currentTicketData = null;
    }

    // Edit data (go back to input)
    function editData() {
        previewSection.style.display = 'none';
        ticketInput.focus();
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Format currency
    function formatCurrency(amount, currency = 'BDT') {
        const num = parseFloat(amount);
        if (isNaN(num)) return amount + ' ' + currency;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
    }
});
