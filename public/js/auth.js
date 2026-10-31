
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const message = document.getElementById('message');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                message.className = 'alert alert-danger';
                message.textContent = data.message || 'Login failed.';
                return;
            }

            // Save login information
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));

            message.className = 'alert alert-success';
            message.textContent = 'Login successful! Redirecting...';

            // Redirect based on user role
            setTimeout(() => {
                if (data.user.role === 'customer') {
                    window.location.href = 'portal.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);

        } catch (error) {
            message.className = 'alert alert-danger';
            message.textContent = 'Unable to connect to server. Please try again.';
        }
    });
}

// Customer signup functionality
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const message = document.getElementById('message');

        if (password !== confirmPassword) {
            message.className = 'alert alert-danger';
            message.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 9) {
            message.className = 'alert alert-danger';
            message.textContent = 'Password must contain at least 9 characters.';
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                message.className = 'alert alert-danger';
                message.textContent = data.message || 'Signup failed.';
                return;
            }

            message.className = 'alert alert-success';
            message.textContent = 'Account created! Redirecting to login...';

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            message.className = 'alert alert-danger';
            message.textContent = 'Unable to connect to server.';
        }
    });
}
// Forgot password functionality
const forgotPasswordForm = document.getElementById('forgotPasswordForm');

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                message.className = 'alert alert-danger';
                message.textContent = data.message || 'Request failed.';
                return;
            }

            message.className = 'alert alert-success';
            message.textContent = 'If your email is registered, a reset link has been generated. Check the server terminal for the development link.';

        } catch (error) {
            message.className = 'alert alert-danger';
            message.textContent = 'Unable to connect to server. Please try again.';
        }
    });
}
// Reset password functionality
const resetPasswordForm = document.getElementById('resetPasswordForm');

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const message = document.getElementById('message');

        // Check passwords
        if (password !== confirmPassword) {
            message.className = 'alert alert-danger';
            message.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 9) {
            message.className = 'alert alert-danger';
            message.textContent = 'Password must contain at least 9 characters.';
            return;
        }

        // Get reset token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            message.className = 'alert alert-danger';
            message.textContent = 'Invalid reset link. Please request a new one.';
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                message.className = 'alert alert-danger';
                message.textContent = data.message || 'Password reset failed.';
                return;
            }

            message.className = 'alert alert-success';
            message.textContent = 'Password reset successfully! Redirecting to login...';

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            message.className = 'alert alert-danger';
            message.textContent = 'Unable to connect to server.';
        }
    });
}