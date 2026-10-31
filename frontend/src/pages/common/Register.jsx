
import React, { useState } from "react";
import { Link } from "react-router-dom";

function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("customer");

    const handleRegister = (e) => {
        e.preventDefault();

        alert("Registration submitted!");
    };

    return (
        <div className="container">
            <h2>Create Account</h2>

            <form onSubmit={handleRegister}>
                <label>Full Name</label>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <label>Email</label>
                <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <label>Account Type</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                >
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                </select>

                <button type="submit">Register</button>
            </form>

            <p>
                Already have an account?
                <Link to="/"> Login</Link>
            </p>
        </div>
    );
}

export default Register;
