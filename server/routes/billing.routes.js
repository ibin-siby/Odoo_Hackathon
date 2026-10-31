const express = require('express');
const router = express.Router();
const { runBilling } = require('../services/billing.service');

// Trigger recurring billing run
router.post('/run', async (req, res) => {
    try {
        const result = await runBilling();
        res.json({
            success: true,
            message: `Billing run completed: ${result.invoices_created} invoices generated.`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Billing run failed: ' + error.message
        });
    }
});

module.exports = router;

