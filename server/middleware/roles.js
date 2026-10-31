function adminOnly(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Admin access required.'
    });
}

function staffAndAdmin(req, res, next) {
    if (req.user && ['admin', 'staff'].includes(req.user.role)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Staff access required.'
    });
}

function customerOnly(req, res, next) {
    if (req.user && req.user.role === 'customer') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Customer access required.'
    });
}

module.exports = {
    adminOnly,
    staffAndAdmin,
    customerOnly
};