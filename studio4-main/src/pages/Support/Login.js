// Support portal login form for customer service agents.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import "./Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        let valid = true;
        let errors = {};

        if (!email) {
            errors.email = "Email is required";
            valid = false;
        }

        if (!password) {
            errors.password = "Password is required";
            valid = false;
        }

        setErrors(errors);
        if (!valid) return;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/dashboard"); //  successful login
        } catch (error) {
            setErrors({ general: "Invalid email or password" });
            console.error(error);
        }
    };

    return (
        <div className="login-page">
            <h1 className="title">ALLORA SERVICE HUB</h1>
            <p className="subtitle">AS A CUSTOMER SUPPORT</p>

            <div className="login-container">
                <h2>Login</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="input-box"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && <p className="error-msg">{errors.email}</p>}

                    <div className="password-container">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="input-box"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <span
                            className="eye-icon"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </span>
                    </div>
                    {errors.password && <p className="error-msg">{errors.password}</p>}
                    {errors.general && <p className="error-msg">{errors.general}</p>}

                    <a href="/forgot-password" className="forgot-password">
                        Forgot Password?
                    </a>

                    <button type="submit" className="login-btn">
                        Login

                    </button>

                    <p className="signup-link">
                        New user? <a href="/signup">Sign up here</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;


