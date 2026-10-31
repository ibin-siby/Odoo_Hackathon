function adminOnly(req, res, next) {
    const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();
    if (role === 'admin') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Admin access required.'
    });
}

function staffAndAdmin(req, res, next) {
    const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();
    if (role === 'admin' || role === 'staff' || role === 'manager') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Staff access required.'
    });
}

function customerOnly(req, res, next) {
    const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();
    if (role === 'customer' || role === 'user') {
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
