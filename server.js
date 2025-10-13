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
    } else if (!normalized.startsWith('0') && normalized.length === 9) {
        normalized = '0' + normalized;
    }

    return normalized;
}

// Login endpoint
server.post('/api/mobile/client/login', (req, res) => {
    const { mobile, pin } = req.body;

    if (!mobile || !pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Mobile and PIN are required'
        });
    }

    // Normalize the incoming phone number
    const normalizedMobile = normalizeZimbabwePhone(mobile);

    const db = router.db;

    // Try to find client by normalized mobile number
    const client = db.get('clients').find(c => {
        const clientMobile = normalizeZimbabwePhone(c.mobile);
        return clientMobile === normalizedMobile;
    }).value();

    if (!client) {
        console.log(`[LOGIN] Client not found for mobile: ${mobile} (normalized: ${normalizedMobile})`);
        return res.status(404).json({
            error: 'Not Found',
            message: 'Client not found'
        });
    }

    if (client.pin !== pin) {
        console.log(`[LOGIN] Invalid PIN for client: ${client.id}`);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid PIN'
        });
    }

    const accessToken = `mock_access_token_${client.id}_${Date.now()}`;
    const refreshToken = `mock_refresh_token_${client.id}_${Date.now()}`;

    console.log(`[LOGIN] Successful login for client: ${client.id} (${client.first_name} ${client.last_name})`);

    res.status(200).json({
        access_token: accessToken,
        access_token_type: 'Bearer',
        access_expires_at: new Date(Date.now() + 3600000).toISOString(),
        refresh_token: refreshToken,
        refresh_expires_at: new Date(Date.now() + 86400000).toISOString(),
        device_id: req.headers['x-device-id'] || 'unknown',
        client: {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            mobile: client.mobile
        }
    });
});

// Set PIN endpoint
server.post('/api/mobile/client/set-pin', (req, res) => {
    const { mobile, new_pin, confirm_pin } = req.body;

    if (!mobile || !new_pin || !confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Mobile, new_pin, and confirm_pin are required'
        });
    }

    if (new_pin !== confirm_pin) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'PINs do not match'
        });
    }

    if (new_pin.length !== 4 || !/^\d+$/.test(new_pin)) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'PIN must be 4 digits'
        });
    }

    // Normalize the incoming phone number
    const normalizedMobile = normalizeZimbabwePhone(mobile);

    const db = router.db;

    // Try to find client by normalized mobile number
    const client = db.get('clients').find(c => {
        const clientMobile = normalizeZimbabwePhone(c.mobile);
        return clientMobile === normalizedMobile;
    }).value();

    if (!client) {
        console.log(`[SET-PIN] Client not found for mobile: ${mobile} (normalized: ${normalizedMobile})`);
        return res.status(404).json({
            error: 'Not Found',
            message: 'Client not found'
        });
    }

    // Update PIN
    db.get('clients').find({ id: client.id }).assign({ pin: new_pin }).write();

    const token = `mock_token_${client.id}_${Date.now()}`;

    console.log(`[SET-PIN] PIN set successfully for client: ${client.id}`);

    res.status(200).json({
        token,
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        expires_in: 3600,
        client: {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            mobile: client.mobile
        }
    });
});

// Refresh token endpoint
server.post('/api/mobile/client/refresh-token', (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Refresh token is required'
        });
    }

    if (refresh_token === 'invalid' || refresh_token === 'expired') {
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

// Payment dashboard
server.get('/api/payments/dashboard', (req, res) => {
    const db = router.db;
    const loans = db.get('loans').value();
    const payments = db.get('payments').value();

    const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstanding_balance, 0);
    const overdueLoans = loans.filter(loan => loan.status === 2 || new Date(loan.next_payment_date) < new Date());
    const overdueAmount = overdueLoans.reduce((sum, loan) => sum + loan.next_payment_amount, 0);

    const recentPayments = payments.slice(-5).reverse();

    res.status(200).json({
        total_outstanding: totalOutstanding,
        next_payment_amount: loans[0]?.next_payment_amount || 0,
        next_payment_date: loans[0]?.next_payment_date || null,
        overdue_amount: overdueAmount,
        overdue_count: overdueLoans.length,
        payment_summaries: loans.map(loan => ({
            loan_id: loan.id,
            loan_type: loan.loan_type,
            product_name: loan.product_name,
            amount_due: loan.next_payment_amount,
            due_date: loan.next_payment_date,
            status: loan.status,
            days_until_due: Math.ceil((new Date(loan.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)),
            penalties: loan.penalties || 0
        })),
        recent_payments: recentPayments
    });
});

// Payment history
server.get('/api/payments/history', (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const db = router.db;
    const allPayments = db.get('payments').value();

    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const payments = allPayments.slice(start, end);

    res.status(200).json({
        payments,
        current_page: parseInt(page),
        total_pages: Math.ceil(allPayments.length / limit),
        total_count: allPayments.length,
        has_next: end < allPayments.length,
        has_previous: page > 1
    });
});

// Payment methods
server.get('/api/payments/methods', (req, res) => {
    res.status(200).json({
        methods: [
            {
                id: 'ecocash',
                name: 'EcoCash',
                type: 'mobile_money',
                provider: 'Econet',
                is_available: true,
                minimum_amount: 1.0,
                maximum_amount: 500000.0,
                transaction_fee: 0.0,
                processing_time: '2-5 minutes'
            }
        ]
    });
});

// Process payment
server.post('/api/payments/process', (req, res) => {
    const { loan_id, amount, payment_method, phone_number } = req.body;

    if (!loan_id || !amount || !payment_method || !phone_number) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'All payment fields are required'
        });
    }

    const paymentId = `PAY${Date.now()}`;
    const receiptNumber = `REC${Date.now()}`;

    res.status(200).json({
        payment_id: paymentId,
        receipt_number: receiptNumber,
        status: 'processing',
        message: 'Payment is being processed. Please wait 2-5 minutes.',
        estimated_completion: new Date(Date.now() + 180000).toISOString()
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
        payment_id: payment.payment_id,
        status: payment.status,
        amount: payment.amount,
        receipt_number: payment.receipt_number,
        processed_at: payment.processed_at
    });
});

// Download receipt
server.get('/api/payments/receipt/:receiptNumber', (req, res) => {
    res.status(200).json({
        receipt_number: req.params.receiptNumber,
        download_url: `http://localhost:8080/receipts/${req.params.receiptNumber}.pdf`,
        message: 'Receipt ready for download'
    });
});

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
        current_page: parseInt(page),
        total_pages: Math.ceil(notifications.length / limit),
        total_count: notifications.length,
        unread_count: notifications.filter(n => !n.is_read).length
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
        unread_count: unreadCount
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