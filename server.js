const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Custom middleware for authentication and request logging
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Request logging
server.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Authentication middleware
const authenticatedRoutes = [
    '/api/mobile/client/me',
    '/api/mobile/client/logout',
    '/api/mobile/client/pin',
    '/api/mobile/client/loans',
    '/api/payments',
    '/api/notifications'
];

server.use((req, res, next) => {
    const isProtected = authenticatedRoutes.some(route => req.path.startsWith(route));

    if (isProtected) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization token'
            });
        }

        const token = authHeader.substring(7);
        if (token === 'expired' || token === 'invalid') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token is expired or invalid'
            });
        }
    }

    next();
});

// Add realistic delay to simulate network latency
server.use((req, res, next) => {
    setTimeout(next, 300 + Math.random() * 700); // 300-1000ms delay
});

// ========== CUSTOM ENDPOINTS ==========

// Helper function to normalize Zimbabwe phone numbers
function normalizeZimbabwePhone(mobile) {
    if (!mobile) return null;

    // Remove all spaces, dashes, and parentheses
    let normalized = mobile.replace(/[\s\-()]/g, '');

    // Handle different formats:
    // 263771234567 -> 0771234567
    // +263771234567 -> 0771234567
    // 0771234567 -> 0771234567
    // 771234567 -> 0771234567

    if (normalized.startsWith('+263')) {
        normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('263')) {
        normalized = '0' + normalized.substring(3);
    } else if (!normalized.startsWith('0')) {
        normalized = '0' + normalized;
    }

    return normalized;
}

// Helper function to convert date string to timestamp
function dateToTimestamp(dateString) {
    if (!dateString) return null;
    return new Date(dateString).getTime();
}

// Helper function to map loan_type string to LoanType enum format
function mapLoanType(loanType) {
    // Map snake_case to UPPERCASE enum
    const typeMap = {
        'cash': 'CASH',
        'paygo': 'PAYGO',
        'pay_go': 'PAYGO'
    };
    return typeMap[loanType] || loanType.toUpperCase();
}

// Helper function to map status code to PaymentStatus enum
function mapPaymentStatus(statusCode) {
    const statusMap = {
        0: 'PENDING',
        1: 'PROCESSING',
        2: 'COMPLETED',
        3: 'OVERDUE',
        4: 'FAILED',
        5: 'CANCELLED',
        6: 'CURRENT'
    };
    return statusMap[statusCode] || 'PENDING';
}

// ========== AUTH ENDPOINTS ==========

// Login endpoint
server.post('/api/mobile/client/login', (req, res) => {
    const { mobile, pin } = req.body;

    if (!mobile || !pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Mobile number and PIN are required'
        });
    }

    const normalizedMobile = normalizeZimbabwePhone(mobile);
    const db = router.db;
    const client = db.get('clients').find({ mobile: normalizedMobile }).value();

    if (!client || client.pin !== pin) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid mobile number or PIN'
        });
    }

    const accessToken = `mock_access_token_${client.id}_${Date.now()}`;
    const refreshToken = `mock_refresh_token_${client.id}_${Date.now()}`;

    res.status(200).json({
        access_token: accessToken,
        access_token_type: 'Bearer',
        access_expires_at: new Date(Date.now() + 3600000).toISOString(),
        refresh_token: refreshToken,
        refresh_expires_at: new Date(Date.now() + 86400000).toISOString(),
        device_id: 'mock_device_001',
        client: {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            mobile: client.mobile,
            email: client.email
        }
    });
});

// Set PIN endpoint
server.post('/api/mobile/client/set-pin', (req, res) => {
    const { mobile, new_pin, confirm_pin } = req.body;

    if (!mobile || !new_pin || !confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All fields are required'
        });
    }

    if (new_pin !== confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'PINs do not match'
        });
    }

    const normalizedMobile = normalizeZimbabwePhone(mobile);
    const db = router.db;
    const client = db.get('clients').find({ mobile: normalizedMobile }).value();

    if (!client) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Client not found'
        });
    }

    db.get('clients')
        .find({ mobile: normalizedMobile })
        .assign({ pin: new_pin })
        .write();

    res.status(200).json({
        message: 'PIN set successfully'
    });
});

// Refresh token endpoint
server.post('/api/mobile/client/refresh-token', (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token || refresh_token === 'expired' || refresh_token === 'invalid') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token'
        });
    }

    const newAccessToken = `mock_access_token_refreshed_${Date.now()}`;
    const newRefreshToken = `mock_refresh_token_refreshed_${Date.now()}`;

    res.status(200).json({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        access_expires_at: new Date(Date.now() + 3600000).toISOString(),
        refresh_expires_at: new Date(Date.now() + 86400000).toISOString()
    });
});

// Get current client (Me)
server.get('/api/mobile/client/me', (req, res) => {
    const db = router.db;
    const client = db.get('clients').first().value();

    res.status(200).json({
        client: {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            mobile: client.mobile,
            email: client.email,
            id_number: client.id_number,
            date_of_birth: client.date_of_birth,
            address: client.address,
            verification_status: client.verification_status
        }
    });
});

// Logout endpoint
server.post('/api/mobile/client/logout', (req, res) => {
    res.status(200).json({
        message: 'Logged out successfully'
    });
});

// Update PIN endpoint
server.post('/api/mobile/client/pin', (req, res) => {
    const { current_pin, new_pin, confirm_pin } = req.body;

    if (!current_pin || !new_pin || !confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All PIN fields are required'
        });
    }

    if (new_pin !== confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'New PINs do not match'
        });
    }

    const db = router.db;
    const client = db.get('clients').first().value();

    if (client.pin !== current_pin) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Current PIN is incorrect'
        });
    }

    db.get('clients').first().assign({ pin: new_pin }).write();

    res.status(200).json({
        message: 'PIN updated successfully'
    });
});

// ========== LOAN ENDPOINTS ==========

// Get client loans
server.get('/api/mobile/client/loans', (req, res) => {
    const { status } = req.query;
    const db = router.db;
    let loans = db.get('loans').value();

    if (status) {
        const statusCode = parseInt(status);
        loans = loans.filter(loan => loan.status === statusCode);
    }

    res.status(200).json({
        loans
    });
});

// ========== CASH LOAN ENDPOINTS ==========

// Get Cash Loan Form Data
server.get('/api/loans/cash/form-data', (req, res) => {
    res.status(200).json({
        repaymentPeriods: [
            "1 month",
            "2 months",
            "3 months",
            "4 months",
            "5 months",
            "6 months",
            "7 months",
            "8 months",
            "9 months",
            "10 months",
            "11 months",
            "1 year",
            "18 months",
            "2 years"
        ],
        loanPurposes: [
            "Business Expansion",
            "Working Capital",
            "Equipment Purchase",
            "Inventory",
            "Home Improvement",
            "Education",
            "Medical Expenses",
            "Debt Consolidation",
            "Emergency",
            "Other"
        ],
        employerIndustries: [
            "Agriculture",
            "Mining",
            "Manufacturing",
            "Construction",
            "Retail",
            "Wholesale",
            "Transport",
            "Hospitality",
            "Finance",
            "Insurance",
            "Real Estate",
            "Technology",
            "Telecommunications",
            "Healthcare",
            "Education",
            "Government",
            "NGO",
            "Self-Employed",
            "Other"
        ],
        minLoanAmount: 100.0,
        maxLoanAmount: 50000.0,
        minCollateralValue: 200.0
    });
});

// Calculate Cash Loan Terms
server.post('/api/loans/cash/calculate', (req, res) => {
    const { loanAmount, repaymentPeriod, employerIndustry, collateralValue, monthlyIncome } = req.body;

    if (!loanAmount || !repaymentPeriod || !employerIndustry || !collateralValue || !monthlyIncome) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All fields are required for calculation'
        });
    }

    // Extract number of months from repayment period
    const monthsMatch = repaymentPeriod.match(/(\d+)/);
    const months = monthsMatch ? parseInt(monthsMatch[1]) : 12;
    const isYear = repaymentPeriod.includes('year');
    const totalMonths = isYear ? months * 12 : months;

    // Calculate interest rate based on amount and period
    let interestRate = 15.0; // Base rate
    if (loanAmount > 10000) interestRate = 12.0;
    if (loanAmount > 25000) interestRate = 10.0;
    if (totalMonths > 12) interestRate -= 1.0;
    if (totalMonths > 18) interestRate -= 0.5;

    // Calculate terms
    const principalAmount = parseFloat(loanAmount);
    const totalInterest = (principalAmount * interestRate * totalMonths) / (100 * 12);
    const totalAmount = principalAmount + totalInterest;
    const monthlyPayment = totalAmount / totalMonths;

    res.status(200).json({
        principalAmount: principalAmount,
        interestRate: interestRate,
        interestAmount: parseFloat(totalInterest.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
        numberOfPayments: totalMonths,
        firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastPaymentDate: new Date(Date.now() + totalMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
        processingFee: parseFloat((principalAmount * 0.02).toFixed(2)),
        insuranceFee: parseFloat((principalAmount * 0.01).toFixed(2)),
        totalFees: parseFloat((principalAmount * 0.03).toFixed(2)),
        ltvRatio: parseFloat(((principalAmount / collateralValue) * 100).toFixed(2)),
        approvalProbability: collateralValue >= principalAmount * 1.5 ? "High" : "Medium",
        disbursementMethod: "Bank Transfer",
        estimatedDisbursementTime: "2-3 business days"
    });
});

// Submit Cash Loan Application
server.post('/api/loans/cash/apply', (req, res) => {
    const application = req.body;

    if (!application.loanAmount || !application.repaymentPeriod || !application.loanPurpose) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Required fields missing'
        });
    }

    const applicationId = `APP${Date.now()}`;

    res.status(201).json({
        applicationId: applicationId,
        statusId: "SUBMITTED",
        message: "Your cash loan application has been submitted successfully. We'll review it within 24-48 hours.",
        referenceNumber: `REF${Date.now()}`,
        estimatedReviewTime: "24-48 hours",
        nextSteps: [
            "Application review by loan officer",
            "Collateral verification",
            "Credit assessment",
            "Final approval decision"
        ]
    });
});

// Upload Collateral Document
server.post('/api/loans/cash/collateral/upload', (req, res) => {
    // Simulate document upload
    const documentId = `DOC${Date.now()}`;

    res.status(200).json({
        documentId: documentId,
        url: `https://mock-storage.soshopay.com/documents/${documentId}`,
        fileName: req.body.fileName || 'collateral_document.pdf',
        fileSize: req.body.fileSize || '2.5 MB',
        uploadDate: new Date().toISOString(),
        status: "uploaded",
        message: "Document uploaded successfully"
    });
});

// ========== PAYGO LOAN ENDPOINTS ==========

// Get PayGo Categories
server.get('/api/loans/paygo/categories', (req, res) => {
    res.status(200).json({
        categories: [
            "Solar Panels",
            "Solar Kits",
            "Batteries",
            "Inverters",
            "Smartphones",
            "Laptops",
            "Tablets",
            "Home Appliances",
            "Farming Equipment",
            "Other Electronics"
        ]
    });
});

// Get PayGo Products by Category
server.get('/api/loans/paygo/products', (req, res) => {
    const { category } = req.query;

    // Mock products - in real API, filter by category
    const products = [
        {
            id: "PROD001",
            name: "Solar Panel 100W",
            category: "Solar Panels",
            description: "High-efficiency 100W solar panel with 25-year warranty",
            retailPrice: 350.0,
            paygoPrice: 420.0,
            dailyRate: 2.5,
            minPeriod: 6,
            maxPeriod: 24,
            imageUrl: "https://example.com/solar-100w.jpg",
            specifications: {
                power: "100W",
                voltage: "12V",
                warranty: "25 years"
            },
            inStock: true
        },
        {
            id: "PROD002",
            name: "Solar Kit 200W",
            category: "Solar Kits",
            description: "Complete solar kit with 200W panel, battery, and inverter",
            retailPrice: 800.0,
            paygoPrice: 960.0,
            dailyRate: 5.0,
            minPeriod: 12,
            maxPeriod: 36,
            imageUrl: "https://example.com/solar-kit-200w.jpg",
            specifications: {
                power: "200W",
                batteryCapacity: "100Ah",
                inverter: "1000W"
            },
            inStock: true
        }
    ];

    const filteredProducts = category
        ? products.filter(p => p.category === category)
        : products;

    res.status(200).json({
        products: filteredProducts,
        total: filteredProducts.length
    });
});

// Calculate PayGo Loan Terms
server.post('/api/loans/paygo/calculate', (req, res) => {
    const { productId, usagePerDay, repaymentPeriod, salaryBand } = req.body;

    if (!productId || !usagePerDay || !repaymentPeriod || !salaryBand) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All fields are required for PayGo calculation'
        });
    }

    // Mock calculation
    const productPrice = 420.0;
    const dailyUsage = parseFloat(usagePerDay);
    const months = parseInt(repaymentPeriod);

    const dailyPayment = (productPrice / (months * 30)) * 1.15; // 15% markup
    const totalAmount = dailyPayment * months * 30;

    res.status(200).json({
        productPrice: productPrice,
        dailyPayment: parseFloat(dailyPayment.toFixed(2)),
        monthlyPayment: parseFloat((dailyPayment * 30).toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        interestAmount: parseFloat((totalAmount - productPrice).toFixed(2)),
        numberOfPayments: months * 30,
        estimatedSavings: parseFloat((dailyUsage * 0.5 * months * 30).toFixed(2))
    });
});

// Submit PayGo Loan Application
server.post('/api/loans/paygo/apply', (req, res) => {
    const application = req.body;

    if (!application.productId || !application.usagePerDay || !application.repaymentPeriod) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Required fields missing'
        });
    }

    const applicationId = `PAYGO${Date.now()}`;

    res.status(201).json({
        applicationId: applicationId,
        statusId: "SUBMITTED",
        message: "Your PayGo loan application has been submitted successfully.",
        referenceNumber: `REF${Date.now()}`
    });
});

// Get loan by ID
server.get('/api/mobile/client/loans/:id', (req, res) => {
    const db = router.db;
    const loan = db.get('loans').find({ id: req.params.id }).value();

    if (!loan) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Loan not found'
        });
    }

    res.status(200).json({ loan });
});

// Get settled loans
server.get('/api/mobile/client/loans/settled', (req, res) => {
    const db = router.db;
    const settledLoans = db.get('settled_loans').value();

    res.status(200).json({
        settled_loans: settledLoans
    });
});

// Get settled loan by ID
server.get('/api/mobile/client/loans/settled/:id', (req, res) => {
    const db = router.db;
    const settledLoan = db.get('settled_loans').find({ id: req.params.id }).value();

    if (!settledLoan) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Settled loan not found'
        });
    }

    res.status(200).json({ settled_loan: settledLoan });
});

// ========== PAYMENT ENDPOINTS ==========

// Payment dashboard - FIXED to match domain model expectations
server.get('/api/payments/dashboard', (req, res) => {
    const db = router.db;
    const loans = db.get('loans').value();
    const payments = db.get('payments').value();

    // Calculate totals
    const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstanding_balance, 0);

    // Find overdue loans (status 3 = OVERDUE or past due date)
    const overdueLoans = loans.filter(loan => {
        if (loan.next_payment_date) {
            const dueDate = new Date(loan.next_payment_date);
            return dueDate < new Date();
        }
        return false;
    });
    const overdueAmount = overdueLoans.reduce((sum, loan) => sum + (loan.next_payment_amount || 0), 0);

    // Get next payment info from active loans
    const activeLoans = loans.filter(loan => loan.status === 3 && loan.next_payment_date);
    const nextPaymentLoan = activeLoans.sort((a, b) =>
        new Date(a.next_payment_date) - new Date(b.next_payment_date)
    )[0];

    // Map payment summaries to match domain model (camelCase + correct types)
    const paymentSummaries = loans.map(loan => {
        const dueDate = loan.next_payment_date ? new Date(loan.next_payment_date) : null;
        const today = new Date();
        const daysUntilDue = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : 0;

        return {
            loanId: loan.id,
            loanType: mapLoanType(loan.loan_type),
            productName: loan.product_name || null,
            amountDue: loan.next_payment_amount || 0,
            //dueDate: dueDate ? dueDate.getTime() : null, // Convert to timestamp (Long)
            dueDate: loan.dueDate || 0, // Convert to timestamp (Long)
            status: mapPaymentStatus(loan.status),
            daysUntilDue: daysUntilDue,
            daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
            penalties: loan.penalties || 0
        };
    });

    // Map recent payments to match domain model (camelCase + correct types)
    const recentPayments = payments.slice(-5).reverse().map(payment => ({
        id: payment.id,
        userId: payment.client_id,
        loanId: payment.loan_id,
        paymentId: payment.payment_id,
        amount: payment.amount,
        method: payment.method,
        phoneNumber: payment.phone_number,
        receiptNumber: payment.receipt_number,
        status: mapPaymentStatus(payment.status === 'completed' ? 2 : 0), // Map string to enum
        processedAt: dateToTimestamp(payment.processed_at),
        failureReason: payment.failure_reason || null,
        createdAt: dateToTimestamp(payment.created_at),
        principal: payment.principal || null,
        interest: payment.interest || null,
        penalties: payment.penalties || null,
        updatedAt: dateToTimestamp(payment.processed_at) // Use processed_at as updatedAt
    }));

    // Return response with camelCase and correct types
    res.status(200).json({
        totalOutstanding: totalOutstanding,
        nextPaymentAmount: nextPaymentLoan?.next_payment_amount || 0,
        nextPaymentDate: nextPaymentLoan?.next_payment_date ? dateToTimestamp(nextPaymentLoan.next_payment_date) : 0,
        overdueAmount: overdueAmount,
        overdueCount: overdueLoans.length,
        paymentSummaries: paymentSummaries,
        recentPayments: recentPayments
    });
});

// Payment history
server.get('/api/payments/history', (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const db = router.db;
    const allPayments = db.get('payments').value();

    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const payments = allPayments.slice(start, end).map(payment => ({
        id: payment.id,
        userId: payment.client_id,
        loanId: payment.loan_id,
        paymentId: payment.payment_id,
        amount: payment.amount,
        method: payment.method,
        phoneNumber: payment.phone_number,
        receiptNumber: payment.receipt_number,
        status: mapPaymentStatus(payment.status === 'completed' ? 2 : 0),
        processedAt: dateToTimestamp(payment.processed_at),
        failureReason: null,
        createdAt: dateToTimestamp(payment.created_at),
        principal: payment.principal || null,
        interest: payment.interest || null,
        penalties: payment.penalties || null,
        updatedAt: dateToTimestamp(payment.processed_at)
    }));

    res.status(200).json({
        payments,
        currentPage: parseInt(page),
        totalPages: Math.ceil(allPayments.length / limit),
        totalCount: allPayments.length,
        hasNext: end < allPayments.length,
        hasPrevious: page > 1
    });
});

// Payment methods
server.get('/api/payments/methods', (req, res) => {
    res.status(200).json({
        methods: [
            {
                id: 'ecocash',
                name: 'EcoCash',
                type: 'ECOCASH',
                description: 'Econet',
                isActive: true,
                minimumAmount: 1.0,
                maximumAmount: 500000.0,
                fees: 0.0,
                processingTime: '2-5 minutes'
            }
        ]
    });
});

// Process payment
server.post('/api/payments/process', (req, res) => {
    const { loanId, amount, paymentMethod, phoneNumber } = req.body;

    if (!loanId || !amount || !paymentMethod || !phoneNumber) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All payment fields are required'
        });
    }

    const paymentId = `PAY${Date.now()}`;
    const receiptNumber = `REC${Date.now()}`;

    res.status(200).json({
        paymentId: paymentId,
        receiptNumber: receiptNumber,
        status: 'PROCESSING',
        message: 'Payment is being processed. Please wait 2-5 minutes.',
        transactionReference: `TXN${Date.now()}`,
        estimatedProcessingTime: '2-5 minutes'
    });
});

// Payment status
server.get('/api/payments/:paymentId/status', (req, res) => {
    const db = router.db;
    const payment = db.get('payments').find({ payment_id: req.params.paymentId }).value();

    if (!payment) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Payment not found'
        });
    }

    res.status(200).json({
        paymentId: payment.payment_id,
        status: mapPaymentStatus(payment.status === 'completed' ? 2 : 0),
        message: 'Payment completed successfully',
        receiptNumber: payment.receipt_number,
        failureReason: null,
        updatedAt: dateToTimestamp(payment.processed_at)
    });
});

// Download receipt
server.get('/api/payments/receipt/:receiptNumber', (req, res) => {
    res.status(200).json({
        receiptNumber: req.params.receiptNumber,
        downloadUrl: `http://localhost:8080/receipts/${req.params.receiptNumber}.pdf`,
        message: 'Receipt ready for download'
    });
});

// ========== NOTIFICATION ENDPOINTS ==========

// Get notifications
server.get('/api/notifications', (req, res) => {
    const { filter = 'all', page = 1, limit = 20 } = req.query;
    const db = router.db;
    let notifications = db.get('notifications').value();

    if (filter === 'unread') {
        notifications = notifications.filter(n => !n.is_read);
    } else if (filter === 'read') {
        notifications = notifications.filter(n => n.is_read);
    }

    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedNotifications = notifications.slice(start, end);

    res.status(200).json({
        notifications: paginatedNotifications,
        currentPage: parseInt(page),
        totalPages: Math.ceil(notifications.length / limit),
        totalCount: notifications.length,
        unreadCount: notifications.filter(n => !n.is_read).length
    });
});

// Mark notification as read
server.put('/api/notifications/:id/read', (req, res) => {
    const db = router.db;
    const notification = db.get('notifications').find({ id: req.params.id }).value();

    if (!notification) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Notification not found'
        });
    }

    db.get('notifications')
        .find({ id: req.params.id })
        .assign({ is_read: true, read_at: new Date().toISOString() })
        .write();

    res.status(200).json({
        message: 'Notification marked as read'
    });
});

// Mark all notifications as read
server.put('/api/notifications/mark-all-read', (req, res) => {
    const db = router.db;

    db.get('notifications')
        .forEach(n => {
            n.is_read = true;
            n.read_at = new Date().toISOString();
        })
        .write();

    res.status(200).json({
        message: 'All notifications marked as read'
    });
});

// Delete notification
server.delete('/api/notifications/:id', (req, res) => {
    const db = router.db;

    db.get('notifications')
        .remove({ id: req.params.id })
        .write();

    res.status(200).json({
        message: 'Notification deleted successfully'
    });
});

// Unread notification count
server.get('/api/notifications/unread/count', (req, res) => {
    const db = router.db;
    const unreadCount = db.get('notifications').filter({ is_read: false }).size().value();

    res.status(200).json({
        unreadCount: unreadCount
    });
});

// Use default router for other routes
server.use('/api', router);

// Start server
const PORT = 8080;
server.listen(PORT, () => {
    console.log('===========================================');
    console.log(`🚀 SoshoPay Mock API Server is running!`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📚 Resources: http://localhost:${PORT}/api`);
    console.log('===========================================');
    console.log('\n📋 Available Endpoints:');
    console.log('   Auth: POST /api/mobile/client/login');
    console.log('   Auth: POST /api/mobile/client/set-pin');
    console.log('   Auth: POST /api/mobile/client/refresh-token');
    console.log('   Profile: GET /api/mobile/client/me');
    console.log('   Loans: GET /api/mobile/client/loans');
    console.log('   Payments: GET /api/payments/dashboard');
    console.log('   Notifications: GET /api/notifications');
    console.log('\n✨ Ready for testing!\n');
});