const API_BASE_URL = "http://localhost:3000";

const auth = {
    currentUser: null,
    mode: 'login', // 'login' or 'signup'
    role: null, // 'customer' or 'staff'

    init: () => {
        const stored = localStorage.getItem('user');
        if (stored) {
            auth.currentUser = JSON.parse(stored);
            auth.onLoginSuccess();
        } else {
            app.showSection('auth');
        }

        document.getElementById('auth-form').addEventListener('submit', auth.handleSubmit);
    },

    showLogin: (role) => {
        auth.role = role;
        auth.mode = 'login';
        document.getElementById('auth-role').value = role;
        document.getElementById('auth-title').textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Login`;
        document.getElementById('auth-submit-btn').textContent = "Login";
        document.getElementById('auth-selection').classList.add('hidden');
        document.getElementById('auth-form-container').classList.remove('hidden');
        document.getElementById('auth-toggle-text').innerHTML = `Don't have an account? <a href="#" onclick="auth.toggleMode()">Sign up here</a>`;
        document.getElementById('auth-msg').textContent = '';
        document.getElementById('auth-msg').className = 'msg';
    },

    toggleMode: () => {
        auth.mode = auth.mode === 'login' ? 'signup' : 'login';
        const title = auth.mode === 'login' ? 'Login' : 'Sign Up';
        document.getElementById('auth-title').textContent = `${auth.role.charAt(0).toUpperCase() + auth.role.slice(1)} ${title}`;
        document.getElementById('auth-submit-btn').textContent = title;
        document.getElementById('auth-toggle-text').innerHTML = auth.mode === 'login'
            ? `Don't have an account? <a href="#" onclick="auth.toggleMode()">Sign up here</a>`
            : `Already have an account? <a href="#" onclick="auth.toggleMode()">Login here</a>`;
    },

    reset: () => {
        document.getElementById('auth-form-container').classList.add('hidden');
        document.getElementById('auth-selection').classList.remove('hidden');
        document.getElementById('auth-form').reset();
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        const msg = document.getElementById('auth-msg');

        if (!username || !password) {
            msg.textContent = "Please fill all fields";
            msg.className = "msg error";
            return;
        }

        const endpoint = auth.mode === 'signup' ? '/auth/signup' : '/auth/login';

        try {
            msg.textContent = "Processing...";
            msg.className = "msg";

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: auth.role })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Authentication failed");
            }

            // Success
            auth.currentUser = data;
            // Allow login to return different structure if needed, currently assumes returns user obj
            // If it returns { access_token }, we need to handle that. 
            // My backend returns the user object (minus password).

            localStorage.setItem('user', JSON.stringify(auth.currentUser));
            auth.onLoginSuccess();

        } catch (err) {
            msg.textContent = err.message;
            msg.className = "msg error";
        }
    },

    onLoginSuccess: () => {
        document.getElementById('auth').classList.add('hidden');
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('user-info').textContent = `Logged in as: ${auth.currentUser.username} (${auth.currentUser.role})`;

        // Show/Hide Nav based on role
        if (auth.currentUser.role === 'staff') {
            document.getElementById('nav-menu').classList.remove('hidden');
            document.getElementById('nav-staff').classList.remove('hidden');
            document.getElementById('nav-customer').classList.add('hidden');
            app.showSection('staff');
        } else {
            document.getElementById('nav-menu').classList.add('hidden');
            document.getElementById('nav-staff').classList.add('hidden');
            document.getElementById('nav-customer').classList.remove('hidden');
            app.showSection('customer');
        }
    },

    logout: () => {
        auth.currentUser = null;
        localStorage.removeItem('user');
        document.getElementById('main-header').classList.add('hidden');
        auth.reset(); // Reset form UI
        app.showSection('auth');
    }
};
