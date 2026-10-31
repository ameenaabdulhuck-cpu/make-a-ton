
import React, { useState } from "react";
import { Link } from "react-router-dom";

function Logi() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Please enter all fields");
            return;
        }

        alert("Login submitted!");
    };

    return (
        <div className="container">
            <h2>Login</h2>

            <form onSubmit={handleLogin}>
                <label>Email</label>
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit">Login</button>
            </form>

            <p>
                Don't have an account?
                <Link to="/register"> Register</Link>
            </p>

            <Link to="/password-reset">
                Forgot Password?
            </Link>
        </div>
    );
}

export default Logi;
