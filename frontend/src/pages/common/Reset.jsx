
import React, { useState } from "react";
import { Link } from "react-router-dom";

function PasswordReset() {
    const [email, setEmail] = useState("");

    const handleReset = (e) => {
        e.preventDefault();

        alert("Password reset request submitted!");
    };

    return (
        <div className="container">
            <h2>Reset Password</h2>

            <p>
                Enter your registered email address
                to reset your password.
            </p>

            <form onSubmit={handleReset}>
                <label>Email Address</label>

                <input
                    type="email"
                    placeholder="Enter registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button type="submit">
                    Send Reset Link
                </button>
            </form>

            <Link to="/">Back to Login</Link>
        </div>
    );
}

export default PasswordReset;
