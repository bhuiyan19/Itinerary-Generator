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
            <div class="ticket-wrapper">
                <!-- Logo and Header -->
                <div class="ticket-logo-header">
                    <img src="https://goflybd.com/wp-content/uploads/2023/07/goFLY-logo.png.webp" alt="goFLY" class="company-logo">
                    <div class="ticket-scan-section">
                        <div class="scan-placeholder">
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                                <rect x="10" y="10" width="60" height="60" fill="#10b981" opacity="0.2"/>
                                <text x="40" y="45" text-anchor="middle" font-size="10" fill="#10b981">QR CODE</text>
                            </svg>
                        </div>
                        <p class="scan-text">Scan me</p>
                    </div>
                </div>

                <!-- Booking Information -->
                <div class="info-grid-modern">
                    <div class="info-box">
                        <div class="info-label-modern">Booking ID</div>
                        <div class="info-value-modern">${data.bookingReference || 'N/A'}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label-modern">Issue Date</div>
                        <div class="info-value-modern">${data.issueDate || 'N/A'}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label-modern">Airlines PNR</div>
                        <div class="info-value-modern">${data.airlinePNR || 'N/A'}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label-modern">GDS/Supplier Ref.</div>
                        <div class="info-value-modern">${data.galileoPNR || 'N/A'}</div>
                    </div>
                </div>
        `;

        // Flight Details Table
        html += `
                <div class="section-title-modern">Flight Details</div>
                <table class="flight-details-table">
                    <thead>
                        <tr>
                            <th>Flight Number</th>
                            <th>Departure</th>
                            <th>Arrival</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.flights && data.flights.length > 0) {
            data.flights.forEach((flight, index) => {
                html += generateFlightRow(flight, data);
            });
        } else {
            html += `<tr><td colspan="4" style="text-align: center; color: #6b7280; font-style: italic;">No flight information available</td></tr>`;
        }

        html += `
                    </tbody>
                </table>

                <!-- Traveler Details -->
                <div class="section-title-modern">Traveler Details</div>
                <table class="traveler-table">
                    <thead>
                        <tr>
                            <th>Passenger Name</th>
                            <th>Baggage</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.passengers && data.passengers.length > 0) {
            data.passengers.forEach((passenger, index) => {
                const baggage = data.flights[0]?.baggage || 'Included';
                html += `
                    <tr>
                        <td>
                            <strong>${passenger.type}</strong><br>
                            ${passenger.name}
                            ${passenger.passport ? `<br><small>Document: ${passenger.passport}</small>` : ''}
                            ${passenger.ticketNumber ? `<br><small>Ticket No: ${passenger.ticketNumber}</small>` : ''}
                        </td>
                        <td>
                            <strong>Baggage Allowance (Included Baggage):</strong><br>
                            ${data.flights.map(f => `${f.from || 'DAC'} to ${f.to || 'Destination'}: ${f.baggage || baggage}`).join('<br>')}
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>

                <!-- Fare Information -->
                <div class="section-title-modern">Fare Information</div>
                <table class="fare-table-modern">
                    <tbody>
        `;

        if (data.fare.baseFare) {
            html += `<tr><td>Base Fare</td><td class="text-right">${formatCurrency(data.fare.baseFare, data.fare.currency)}</td></tr>`;
        }
        if (data.fare.tax) {
            html += `<tr><td>Tax & Fees</td><td class="text-right">${formatCurrency(data.fare.tax, data.fare.currency)}</td></tr>`;
        }
        if (data.fare.total) {
            html += `<tr class="total-row"><td><strong>Total Amount</strong></td><td class="text-right"><strong>${formatCurrency(data.fare.total, data.fare.currency)}</strong></td></tr>`;
        }

        html += `
                    </tbody>
                </table>

                <!-- Remarks -->
                <div class="remarks-section">
                    <h4>Remarks</h4>
                    <div class="remarks-content">
                        <strong>Flight Notes:</strong>
                        <ul>
                            <li>At check-in, please show a Photo ID Proof and the document you gave for reference at reservation time.</li>
                            <li>Specific rules and restrictions may apply to this fare.</li>
                            <li>Taxes are included except where local airport taxes are collected at check-in time.</li>
                            <li>In case of international travel please ensure that your passport is valid for at least 6 months in advance and you have all valid visa for your trip.</li>
                        </ul>
                        <strong>CHECK-IN AT AIRPORT:</strong>
                        <p>Please report at check-in counter of airline at airport at least 3 Hrs prior to flight departure for International flights and 2 Hrs prior for within country flights.</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="ticket-footer">
                    <div class="footer-contact">
                        <div><strong>Customer Service:</strong> support@goflybd.com</div>
                        <div><strong>Helpline:</strong> 09639203090</div>
                        <div><strong>Office:</strong> 1 Shukrabad Road Motiur Nibash, Beside New Model Degree College, Opposite of Metro Shopping Mall, Dhaka, 1207</div>
                    </div>
                </div>
            </div>
        `;

        ticketPreview.innerHTML = html;
    }

    // Generate flight row for table
    function generateFlightRow(flight, ticketData) {
        const airlineLogo = `<div class="airline-logo-small">${flight.airline?.substring(0, 2) || 'XX'}</div>`;

        return `
            <tr>
                <td>
                    ${airlineLogo}
                    <strong>${flight.airline || 'Airline'}-${flight.flightNumber || 'XXX'}</strong>
                    ${flight.aircraft ? `<br><small>${flight.aircraft}</small>` : ''}
                    ${flight.class ? `<br><small>Class: ${flight.class}</small>` : ''}
                </td>
                <td>
                    <strong>${flight.fromCode || flight.from || 'DAC'}</strong><br>
                    ${flight.departureDate || 'N/A'}<br>
                    ${flight.departureTime || 'N/A'}<br>
                    ${flight.fromTerminal ? `Terminal ${flight.fromTerminal}` : ''}
                </td>
                <td>
                    <strong>${flight.toCode || flight.to || 'Destination'}</strong><br>
                    ${flight.arrivalDate || 'N/A'}<br>
                    ${flight.arrivalTime || 'N/A'}<br>
                    ${flight.toTerminal ? `Terminal ${flight.toTerminal}` : ''}
                </td>
                <td>${flight.duration || 'N/A'}</td>
            </tr>
        `;
    }

    // Generate flight card HTML
    function generateFlightCard(flight, flightNum) {
        return `
            <div class="flight-card">
                <div class="flight-header">
                    <div class="flight-basic-info">
                        <h4>Flight ${flightNum}: ${flight.airline || 'Airline'} ${flight.flightNumber || ''}</h4>
                        ${flight.status ? `<span class="status-badge status-confirmed">${flight.status}</span>` : ''}
                    </div>
                </div>

                <div class="flight-route">
                    <div class="route-point">
                        <div class="route-city">${flight.from || 'Origin'}</div>
                        ${flight.fromCode ? `<div class="route-code">${flight.fromCode}</div>` : ''}
                        <div class="route-datetime">
                            ${flight.departureDate ? `<div class="route-date">${flight.departureDate}</div>` : ''}
                            ${flight.departureTime ? `<div class="route-time">${flight.departureTime}</div>` : ''}
                        </div>
                    </div>

                    <div class="route-connector">
                        <div class="route-arrow">✈</div>
                        ${flight.duration ? `<div class="route-duration">${flight.duration}</div>` : ''}
                    </div>

                    <div class="route-point">
                        <div class="route-city">${flight.to || 'Destination'}</div>
                        ${flight.toCode ? `<div class="route-code">${flight.toCode}</div>` : ''}
                        <div class="route-datetime">
                            ${flight.arrivalDate ? `<div class="route-date">${flight.arrivalDate}</div>` : ''}
                            ${flight.arrivalTime ? `<div class="route-time">${flight.arrivalTime}</div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="flight-details-grid">
                    ${flight.class ? `
                        <div class="info-item">
                            <div class="info-label">Class</div>
                            <div class="info-value">${flight.class}</div>
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
                    ${flight.status ? `
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">${flight.status}</div>
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
